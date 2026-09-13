const fields = {
  MAKER_QUEUE: 'assigned_maker',
  L1_CHECKER_QUEUE: 'assigned_checker_l1',
  L2_CHECKER_QUEUE: 'assigned_checker_l2',
  MLRO_QUEUE: 'assigned_mlro',
};

export function isUnassigned(caseItem) {
  const field = fields[caseItem.current_queue];
  if (!field) return false;
  const name = caseItem[field];
  return !name?.trim() || /^unassigned\b/i.test(name.trim());
}
