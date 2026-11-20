/**
 * Tracks how many live socket connections each user has.
 * A user is considered online while at least one tab/device is connected.
 */
const connections = new Map<number, number>();

export function addConnection(userId: number): boolean {
  const next = (connections.get(userId) ?? 0) + 1;
  connections.set(userId, next);
  return next === 1;
}

/** Returns true when the user just went offline. */
export function removeConnection(userId: number): boolean {
  const current = connections.get(userId) ?? 0;
  if (current <= 1) {
    connections.delete(userId);
    return current === 1;
  }
  connections.set(userId, current - 1);
  return false;
}

export function isOnline(userId: number): boolean {
  return connections.has(userId);
}

export function onlineUserIds(): number[] {
  return [...connections.keys()];
}
