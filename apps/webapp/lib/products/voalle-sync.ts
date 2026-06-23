import { getAccessToken, resolveVoalleCredentials } from '@/lib/voalle';
import { ProductRepository, ProductExternalRefRepository, db, products_table, product_external_refs_table } from '@workspace/db';
import { eq, and, isNull } from 'drizzle-orm';
import type { CoverageCity } from './types';

type VoalleCampaignResponse = {
  success: boolean;
  response: VoalleCampaign[];
};

type VoalleCampaign = {
  code: string;
  title: string;
  status: string;
  description: string;
  campaignRegions: CampaignRegion[];
  campaignPriceList: CampaignPriceList[];
};

type CampaignRegion = {
  campaignRegionCities: CampaignRegionCity[];
};

type CampaignRegionCity = {
  code: number;
  name: string;
  state: string;
};

type CampaignPriceList = {
  id: number;
  code: string;
  title: string;
  description: string | null;
  campaignPriceListProductServices: ProductService[];
};

type ProductService = {
  code: string;
  title: string;
  description: string | null;
  sellingPrice: number;
  type: number;
  priceListUseType: string;
  use: string;
  paymentFormTitle: string;
  paymentFormCode: string;
  minimumPromotionalPrice: number | null;
  isLoyalty: boolean;
  loyaltyPrice: number;
  monthDurationLoyalty: number;
};

const ACTIVE_STATUS = 'Em Execução';

const ALLOWED_CAMPAIGN_CODES = new Set([
  'B2C (IA) - 088',
  'B2C (IA) - 089',
  'B2C (IA) - 090',
  'B2C (IA) - 091',
  'B2C (IA) - 092',
]);

const CAMPAIGN_BENEFITS: Record<string, string[]> = {
  'B2C (IA) - 088': ['Connect TV', 'BitBook', 'BitTopics', 'Mestre Curso', 'Clipsy'],
  'B2C (IA) - 089': ['BitTrainers', 'Connect TV', 'BitBook', 'BitTopics', 'Mestre Curso', 'Clipsy'],
  'B2C (IA) - 090': ['GloboPlay', 'BitTrainers', 'Connect TV', 'BitBook', 'BitTopics', 'Mestre Curso', 'Clipsy'],
  'B2C (IA) - 091': ['GloboPlay', 'BitTrainers', 'Connect TV', 'BitBook', 'BitTopics', 'Mestre Curso', 'Clipsy'],
  'B2C (IA) - 092': ['GloboPlay', 'BitTrainers', 'Connect TV', 'BitBook', 'BitTopics', 'Mestre Curso', 'Clipsy'],
};

const CAMPAIGN_SPEED: Record<string, number> = {
  'B2C (IA) - 088': 100,
  'B2C (IA) - 089': 200,
  'B2C (IA) - 090': 300,
  'B2C (IA) - 091': 650,
  'B2C (IA) - 092': 650,
};

const CAMPAIGN_SORT_ORDER: Record<string, number> = {
  'B2C (IA) - 088': 1,
  'B2C (IA) - 089': 2,
  'B2C (IA) - 090': 3,
  'B2C (IA) - 091': 4,
  'B2C (IA) - 092': 5,
};

const isRenewalProduct = (product: ProductService): boolean =>
  product.title.includes(' RN') || product.title.endsWith(' RN_2026');

const extractStreamingLabel = (productTitle: string): string | null => {
  const lower = productTitle.toLowerCase();
  if (lower.includes('premiere')) return 'GloboPlay + Premiere';
  if (lower.includes('telecine')) return 'GloboPlay + Telecine';
  if (lower.includes('globoplay')) return 'GloboPlay';
  return null;
};

const CAMPAIGNS_WITH_STREAMING = new Set(['B2C (IA) - 091', 'B2C (IA) - 092']);

const buildProductName = (campaignCode: string, productTitle: string): string => {
  const speedMbps = CAMPAIGN_SPEED[campaignCode] ?? 0;
  const speed = `${speedMbps} Mega`;
  const streaming = extractStreamingLabel(productTitle);
  const isDiscounted = campaignCode === 'B2C (IA) - 092';

  const parts = [`Plano ${speed}`];

  if (streaming && CAMPAIGNS_WITH_STREAMING.has(campaignCode)) {
    parts.push(`+ ${streaming}`);
  }

  if (isDiscounted) {
    parts.push('(Com desconto)');
  }

  return parts.join(' ');
};

const extractCoverageCities = (campaign: VoalleCampaign): CoverageCity[] => {
  const cities: CoverageCity[] = [];

  for (const region of campaign.campaignRegions) {
    for (const city of region.campaignRegionCities) {
      cities.push({ city: city.name, state: city.state });
    }
  }

  return cities;
};

export type SyncResult = {
  created: number;
  updated: number;
  removed: number;
  errors: string[];
};

export const syncVoalleProducts = async (workspaceId: string): Promise<SyncResult> => {
  const result: SyncResult = { created: 0, updated: 0, removed: 0, errors: [] };

  try {
    const creds = await resolveVoalleCredentials(workspaceId);
    if (!creds) {
      result.errors.push('Integração Voalle não configurada para este workspace');
      return result;
    }

    const token = await getAccessToken(creds);

    console.log('[VoalleSync] Buscando campanhas do Voalle...');

    const res = await fetch(
      `${creds.apiUrl}/external/integrations/thirdparty/crm/campaignsandpricelistservices`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      }
    );

    if (!res.ok) {
      const body = await res.text();
      result.errors.push(`HTTP ${res.status}: ${body}`);
      return result;
    }

    const data = (await res.json()) as VoalleCampaignResponse;

    if (!data.success || !data.response) {
      result.errors.push('API returned success: false');
      return result;
    }

    const allowedCampaigns = data.response.filter(
      c => ALLOWED_CAMPAIGN_CODES.has(c.code) && c.status === ACTIVE_STATUS
    );

    console.log('[VoalleSync] Campanhas permitidas e ativas:', allowedCampaigns.length, 'de', data.response.length, 'total');

    // Coletar codes dos produtos que virao do sync
    const validProductCodes = new Set<string>();

    for (const campaign of allowedCampaigns) {
      for (const priceList of campaign.campaignPriceList) {
        for (const product of priceList.campaignPriceListProductServices) {
          if (!isRenewalProduct(product)) {
            validProductCodes.add(`voalle_${product.code}`);
          }
        }
      }
    }

    // Remover produtos Voalle que nao pertencem mais as campanhas permitidas
    const existingVoalleProducts = await db
      .select({ id: products_table.id, code: products_table.code })
      .from(products_table)
      .where(
        and(
          eq(products_table.workspace_id, workspaceId),
          eq(products_table.source, 'voalle'),
          isNull(products_table.deleted_at)
        )
      );

    for (const existing of existingVoalleProducts) {
      if (!validProductCodes.has(existing.code)) {
        await ProductRepository.softDelete(existing.id);
        // Limpar external refs associadas
        await db
          .delete(product_external_refs_table)
          .where(eq(product_external_refs_table.product_id, existing.id));
        result.removed++;
      }
    }

    if (result.removed > 0) {
      console.log('[VoalleSync] Produtos removidos (fora das campanhas permitidas):', result.removed);
    }

    for (const campaign of allowedCampaigns) {
      const benefits = CAMPAIGN_BENEFITS[campaign.code] ?? [];
      const coverageCities = extractCoverageCities(campaign);
      const speedMbps = CAMPAIGN_SPEED[campaign.code];
      const sortOrder = CAMPAIGN_SORT_ORDER[campaign.code] ?? 99;

      for (const priceList of campaign.campaignPriceList) {
        const products = priceList.campaignPriceListProductServices.filter(p => !isRenewalProduct(p));

        for (const product of products) {
          try {
            const productCode = `voalle_${product.code}`;
            const productName = buildProductName(campaign.code, product.title);

            const existing = await ProductRepository.findByWorkspaceAndCode(workspaceId, productCode);

            const productData = {
              code: productCode,
              name: productName,
              description: product.description,
              type: 'internet_plan' as const,
              base_price: String(product.sellingPrice),
              is_loyalty: product.isLoyalty,
              loyalty_months: product.monthDurationLoyalty || null,
              loyalty_price: product.loyaltyPrice ? String(product.loyaltyPrice) : null,
              specs: {
                speed_mbps: speedMbps ?? null,
                download: speedMbps ? `${speedMbps} Mega` : null,
              },
              benefits,
              coverage_cities: coverageCities,
              payment_method: product.paymentFormTitle,
              status: 'active',
              is_visible: true,
              sort_order: sortOrder,
              source: 'voalle',
            };

            if (existing) {
              await ProductRepository.update(existing.id, productData);
              await ProductExternalRefRepository.upsertByExternalId(
                workspaceId,
                'voalle',
                product.code,
                { product_id: existing.id, external_data: product }
              );
              result.updated++;
            } else {
              const created = await ProductRepository.create({
                ...productData,
                workspace_id: workspaceId,
              });
              await ProductExternalRefRepository.upsertByExternalId(
                workspaceId,
                'voalle',
                product.code,
                { product_id: created.id, external_data: product }
              );
              result.created++;
            }
          } catch (err) {
            result.errors.push(`Produto ${product.code}: ${String(err)}`);
          }
        }
      }
    }

    console.log('[VoalleSync] Sync concluído:', result);
    return result;
  } catch (err) {
    console.error('[VoalleSync] Erro no sync:', err);
    result.errors.push(String(err));
    return result;
  }
};
