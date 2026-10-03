export const num = (n: number) => n.toLocaleString("en-US");
export const myr = (n: number) =>
  `RM ${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
export const pct = (p: number, digits = 0) => `${(p * 100).toFixed(digits)}%`;
