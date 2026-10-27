export const isRecord = (x: unknown): x is Record<string, unknown> =>
  typeof x === 'object' && x !== null;

export const isFiniteNumber = (x: unknown): x is number =>
  typeof x === 'number' && Number.isFinite(x);
