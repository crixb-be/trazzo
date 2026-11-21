import { Shell } from "@/components/layout/Shell";
import { WorkspaceProvider } from "@/components/layout/WorkspaceProvider";

export default function DashboardLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <WorkspaceProvider>
      <Shell>{children}</Shell>
    </WorkspaceProvider>
  );
}
