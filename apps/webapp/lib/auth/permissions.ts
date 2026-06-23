export type Role = 'owner' | 'admin' | 'member';

type Capabilities = {
  /** Can see the "Configurações" menu group and access its pages. */
  accessSettings: boolean;
  /** Can create / edit / remove users. */
  manageUsers: boolean;
  /** Can promote/demote/assign the owner role. */
  manageOwners: boolean;
  /** Can delete the whole account/workspace. */
  deleteAccount: boolean;
  /** Sees only the leads/clients where they are the chat assignee. */
  restrictedLeadScope: boolean;
  /** Can assign a lead to anyone and distribute unassigned leads in bulk. */
  assignLeads: boolean;
  /** Can connect / configure / enable / disable apps in "Apps e Integrações". */
  manageIntegrations: boolean;
  /** Can move leads into / within post-sale stages (faturamento, entrega, ...). */
  editPostSaleStages: boolean;
};

const ROLE_CAPABILITIES: Record<Role, Capabilities> = {
  owner: {
    accessSettings: true,
    manageUsers: true,
    manageOwners: true,
    deleteAccount: true,
    restrictedLeadScope: false,
    assignLeads: true,
    manageIntegrations: true,
    editPostSaleStages: true,
  },
  admin: {
    accessSettings: true,
    manageUsers: true,
    manageOwners: false,
    deleteAccount: false,
    restrictedLeadScope: false,
    assignLeads: true,
    manageIntegrations: true,
    editPostSaleStages: true,
  },
  member: {
    accessSettings: false,
    manageUsers: false,
    manageOwners: false,
    deleteAccount: false,
    restrictedLeadScope: true,
    assignLeads: false,
    manageIntegrations: false,
    editPostSaleStages: false,
  },
};

const ROLE_LABELS: Record<Role, string> = {
  owner: 'Proprietário',
  admin: 'Administrador',
  member: 'Membro',
};

const ROLE_BADGE_COLORS: Record<Role, string> = {
  owner: 'bg-primary text-primary-foreground',
  admin: 'bg-primary/40 text-primary-foreground',
  member: 'bg-secondary text-secondary-foreground',
};

/** Roles offered in the user form select (owner is never selectable). */
export const ASSIGNABLE_ROLES: { value: Role; label: string }[] = [
  { value: 'admin', label: ROLE_LABELS.admin },
  { value: 'member', label: ROLE_LABELS.member },
];

/** Default role for new users / DB column. */
export const DEFAULT_ROLE: Role = 'member';

export const normalizeRole = (role: string | null | undefined): Role => {
  if (role === 'sdr') {
    return 'member';
  }

  if (role && role in ROLE_CAPABILITIES) {
    return role as Role;
  }

  return DEFAULT_ROLE;
};

const capabilitiesOf = (role: string | null | undefined): Capabilities => ROLE_CAPABILITIES[normalizeRole(role)];

export const getRoleLabel = (role: string | null | undefined): string => ROLE_LABELS[normalizeRole(role)];

export const getRoleBadgeColor = (role: string | null | undefined): string => ROLE_BADGE_COLORS[normalizeRole(role)];

export const canAccessSettings = (role: string | null | undefined): boolean => capabilitiesOf(role).accessSettings;

export const canManageUsers = (role: string | null | undefined): boolean => capabilitiesOf(role).manageUsers;

export const canManageOwners = (role: string | null | undefined): boolean => capabilitiesOf(role).manageOwners;

export const canDeleteAccount = (role: string | null | undefined): boolean => capabilitiesOf(role).deleteAccount;

export const isLeadScopeRestricted = (role: string | null | undefined): boolean => capabilitiesOf(role).restrictedLeadScope;

export const canAssignLeads = (role: string | null | undefined): boolean => capabilitiesOf(role).assignLeads;

export const canManageIntegrations = (role: string | null | undefined): boolean => capabilitiesOf(role).manageIntegrations;

export const canEditPostSaleStages = (role: string | null | undefined): boolean => capabilitiesOf(role).editPostSaleStages;
