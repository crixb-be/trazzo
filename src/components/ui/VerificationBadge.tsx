import { isVerifiedSource } from "@/data/rne/verification";
import { Badge } from "./Badge";

export function VerificationBadge({
  source,
}: {
  source: { verified_at?: string | null; source_resolution?: string | null };
}) {
  return isVerifiedSource(source) ? (
    <Badge variant="ok">Verificado</Badge>
  ) : (
    <Badge variant="por-verificar">Por verificar</Badge>
  );
}
