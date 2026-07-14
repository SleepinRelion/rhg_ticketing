/**
 * Central role name constants.
 * Always import from here — never hardcode role strings directly.
 * This ensures role names only need to change in one place.
 */
export const ROLES = {
  ADMIN: 'admin',
  MANAGER: 'manager',
  TECHNICIAN: 'technician',
  STAFF: 'staff',
  GUEST: 'guest',
};

/** Roles that have elevated management privileges */
export const MANAGEMENT_ROLES = [ROLES.ADMIN, ROLES.MANAGER];

/** Roles that can view and action tickets */
export const TECHNICIAN_ROLES = [ROLES.ADMIN, ROLES.MANAGER, ROLES.TECHNICIAN];
