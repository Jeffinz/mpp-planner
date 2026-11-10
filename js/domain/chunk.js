// ABOUTME: Splits a list into groups of at most `size` items.
// ABOUTME: Used to keep Firestore batched writes under the 500-operation limit.
export function chunk(items, size) {
  const groups = [];
  for (let i = 0; i < items.length; i += size) groups.push(items.slice(i, i + size));
  return groups;
}
