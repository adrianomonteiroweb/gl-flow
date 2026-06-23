export type ViaCepAddress = {
  cep: string;
  logradouro: string;
  complemento: string;
  bairro: string;
  localidade: string;
  uf: string;
  erro?: boolean;
};

export const fetchAddressByZip = async (zip: string): Promise<ViaCepAddress | null> => {
  const cleanZip = zip.replace(/\D/g, '');
  if (cleanZip.length !== 8) return null;

  try {
    const res = await fetch(`https://viacep.com.br/ws/${cleanZip}/json/`);
    if (!res.ok) return null;
    const data = (await res.json()) as ViaCepAddress;
    if (data.erro) return null;
    return data;
  } catch {
    return null;
  }
};
