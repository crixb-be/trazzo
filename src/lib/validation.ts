export function isValidRuc(ruc: string): boolean {
  const value = ruc.trim();
  return value === "" || /^(10|15|17|20)\d{9}$/.test(value);
}
