import type { Plan } from "@/lib/plans/plans";
import type { PaymentProviderAvailability } from "./providers";

export interface BillingViewState {
  mode: "native" | "web";
  showCheckout: boolean;
  message: string;
  currentPlanLabel: string;
}

export function billingViewState(
  native: boolean,
  plan: Plan,
  providers: PaymentProviderAvailability,
): BillingViewState {
  const currentPlanLabel = plan === "free" ? "Free" : plan === "student" ? "Estudiante" : "Pro";
  if (native) {
    return {
      mode: "native",
      showCheckout: false,
      message:
        "Tu estado de cuenta se sincroniza automáticamente al iniciar sesión en TRAZZO.",
      currentPlanLabel,
    };
  }
  const hasProvider = providers.mercadopago || providers.culqi;
  return {
    mode: "web",
    showCheckout: true,
    message: hasProvider ? "Checkout web disponible." : "Pasarela en modo demo / sin configurar",
    currentPlanLabel,
  };
}

