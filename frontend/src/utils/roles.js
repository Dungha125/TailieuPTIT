export const ROLE_ADMIN = 'admin';
export const ROLE_EDITOR = 'editor';

export const PORTAL_ROLES = [ROLE_ADMIN, ROLE_EDITOR];

export const ROLE_LABELS = {
  [ROLE_ADMIN]: 'Quản trị viên',
  [ROLE_EDITOR]: 'Biên tập viên',
};

export function isPortalRole(role) {
  return PORTAL_ROLES.includes(role);
}

export function isAdmin(role) {
  return role === ROLE_ADMIN;
}

export function isEditor(role) {
  return role === ROLE_EDITOR;
}

export function roleLabel(role) {
  return ROLE_LABELS[role] || role;
}
