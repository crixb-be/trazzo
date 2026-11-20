import type { Metadata } from "next";
import { StudioWorkspace } from "@/components/studio/StudioWorkspace";

export const metadata: Metadata = { title: "Estudio" };

export default function StudioPage() {
  return <StudioWorkspace />;
}
