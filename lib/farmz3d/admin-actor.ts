// Who is acting in the panel. The panel has one login; the Thiago/Bruna switch picks the name.
export function actorName(value: unknown) {
  if (value === 'thiago') return 'Thiago';
  if (value === 'bruna') return 'Bruna';
  return process.env.ADMIN_DASHBOARD_USER || 'admin';
}
