/**
 * Calculates the difference between two objects.
 * Returns an object with 'old' and 'new' states for changed fields.
 */
export const calculateDiff = (oldData: any, newData: any) => {
  if (!oldData || !newData) return null;

  const diff: { old: any; new: any } = { old: {}, new: {} };
  let hasChanges = false;

  // We iterate over the keys of newData because that's what's being updated
  Object.keys(newData).forEach(key => {
    // Skip internal or irrelevant fields
    if (['updated_at', 'created_at', 'id', 'company_id', 'timestamp'].includes(key)) return;

    // Convert undefined to null for Firestore compatibility
    const oldValue = oldData[key] === undefined ? null : oldData[key];
    const newValue = newData[key] === undefined ? null : newData[key];

    // Simple deep comparison using JSON.stringify for objects/arrays
    const isOldObject = oldValue !== null && typeof oldValue === 'object';
    const isNewObject = newValue !== null && typeof newValue === 'object';

    if (isOldObject || isNewObject) {
      if (JSON.stringify(oldValue) !== JSON.stringify(newValue)) {
        diff.old[key] = oldValue;
        diff.new[key] = newValue;
        hasChanges = true;
      }
    } else if (oldValue !== newValue) {
      diff.old[key] = oldValue;
      diff.new[key] = newValue;
      hasChanges = true;
    }
  });

  return hasChanges ? diff : null;
};
