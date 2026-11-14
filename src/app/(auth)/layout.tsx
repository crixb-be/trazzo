import { AuthCard } from "@/components/auth/AuthCard";

export default function AuthLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <main className="auth-page">
      <div className="auth-grid-mark" aria-hidden="true" />
      {children}
      <p className="auth-footer mono">RNE / MVCS · trabajo local primero</p>
    </main>
  );
}
