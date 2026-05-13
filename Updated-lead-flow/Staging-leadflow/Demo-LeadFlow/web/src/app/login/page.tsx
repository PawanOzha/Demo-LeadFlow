import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { dbQueryOne } from "@/lib/db/pool";
import { homePathForRole } from "@/lib/role-home";
import LoginForm from "./login-form";

export default async function LoginPage() {
  const session = await getSession();
  if (session) {
    const user = await dbQueryOne<{ mustResetPassword: boolean }>(
      `SELECT "mustResetPassword" FROM "User" WHERE id = $1`,
      [session.id],
    );
    if (user?.mustResetPassword) {
      redirect("/reset-password");
    }
    redirect(homePathForRole(session.role) ?? "/login");
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-lf-bg px-4">
      <div className="w-full max-w-[440px] rounded-lg border border-lf-border bg-lf-surface p-8 shadow-[var(--shadow-lf-sm)]">
        <div className="text-center">
          <h1 className="text-2xl font-semibold tracking-tight text-lf-text">
            LeadFlow
          </h1>
          <p className="mt-2 text-sm text-lf-label">Sign in to continue</p>
        </div>
        <LoginForm />
      </div>
    </div>
  );
}
