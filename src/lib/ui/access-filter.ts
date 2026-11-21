/** Access filter shared by the Normativa catalog and the pocket measures. */
export type AccessFilter = "todas" | "gratuitas" | "pro" | "favoritas";

export const ACCESS_FILTER_OPTIONS: ReadonlyArray<{ value: AccessFilter; label: string }> = [
  { value: "todas", label: "Todas" },
  { value: "gratuitas", label: "Gratuitas" },
  { value: "pro", label: "PRO" },
  { value: "favoritas", label: "Favoritas" },
];

export function accessFilterLabel(value: AccessFilter): string {
  return ACCESS_FILTER_OPTIONS.find((option) => option.value === value)?.label ?? "Todas";
}

/** Reads the `acceso` URL param; the old `free=1` link still means "Gratuitas". */
export function parseAccessFilter(params: { get(name: string): string | null }): AccessFilter {
  const value = params.get("acceso");
  if (ACCESS_FILTER_OPTIONS.some((option) => option.value === value)) return value as AccessFilter;
  return params.get("free") === "1" ? "gratuitas" : "todas";
}

/** "PRO" keeps only content marked PRO (Estudiante / Pro plans). */
export function matchesAccessFilter(
  filter: AccessFilter,
  item: { isPro: boolean; favorite: boolean },
): boolean {
  switch (filter) {
    case "gratuitas":
      return !item.isPro;
    case "pro":
      return item.isPro;
    case "favoritas":
      return item.favorite;
    default:
      return true;
  }
}

/** Favourite key for a pocket measure in the shared library activity table. */
export function measureFavoriteKey(id: string): string {
  return "medida:" + id;
}
