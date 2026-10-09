export const num = (n: number) => n.toLocaleString("en-US");
export const myr = (n: number) =>
  `RM ${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
export const pct = (p: number, digits = 0) => `${(p * 100).toFixed(digits)}%`;

/** +12.3% / -4% from a fraction; always signed. */
export const signedPct = (fraction: number, digits = 1) =>
  `${fraction >= 0 ? "+" : "-"}${Math.abs(fraction * 100).toFixed(digits)}%`;
