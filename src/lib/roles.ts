// M4A-2 · role + tenancy helpers. The admin app is shared by Kiwoo OPERATORS and Marketplace
// PARTICIPANTS (Corp/LEH/merchant/approved LP). A pure participant must see ONLY the participant
// Marketplace section — never operator/ops pages — and vice-versa. Ownership is ALWAYS enforced
// server-side (by JWT identity); these labels only gate navigation UX.

import type { Role } from "@/types";

/** Roles that make a user a Marketplace participant. */
export const PARTICIPANT_ROLES: Role[] = ["PARTICIPANT", "CORP", "LEH", "MERCHANT_PARTICIPANT"];

/** Kiwoo operator/staff roles (the existing admin surfaces). */
export const OPERATOR_ROLES: Role[] = ["ADMIN", "SUPER_ADMIN", "TREASURY", "COMPLIANCE", "VIEWER"];

export function hasAny(roles: Role[] | undefined, allowed: Role[]): boolean {
  if (!roles || roles.length === 0) return false;
  return roles.some((r) => allowed.includes(r));
}
