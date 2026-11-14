import { Card } from "@/components/ui";

export function AssistantQuota({ used = 0, limit = 10 }: { used?: number; limit?: number }) {
  const percentage = limit === Infinity ? 12 : Math.min(100, (used / limit) * 100);
  return (
    <Card className="assistant-quota">
      <div className="eyebrow">CUOTA DE CONSULTAS</div>
      <div className="quota-number mono">
        {limit === Infinity ? "∞" : limit - used}{" "}
        <span>/ {limit === Infinity ? "ilimitado" : "mes"}</span>
      </div>
      <div className="quota-track">
        <span style={{ width: percentage + "%" }} />
      </div>
      <p className="muted small">
        Modo local: las respuestas se construyen solo con fichas indexadas.
      </p>
    </Card>
  );
}
