import { chapterFor } from "@/lib/calculators/takeoff";
import type { Project, Takeoff } from "@/lib/offline/db";

export function projectIndicators({
  builtArea,
  takeoffs,
}: {
  builtArea: Project["builtArea"];
  takeoffs: readonly Pick<Takeoff, "partName" | "subtotalPen">[];
}) {
  const area = builtArea !== null && Number.isFinite(builtArea) && builtArea > 0 ? builtArea : null;
  const total = takeoffs.length ? takeoffs.reduce((sum, row) => sum + row.subtotalPen, 0) : null;
  return {
    area,
    total,
    costPerSquareMeter: area !== null && total !== null ? total / area : null,
    count: takeoffs.length,
    chapters: [...new Set(takeoffs.map((row) => chapterFor(row.partName)))],
  };
}
