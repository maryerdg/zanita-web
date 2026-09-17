export function canPickupCetys(role?: string | null): boolean {
  if (!role) return false;
  return role === 'cetys' || role === 'admin';
}
