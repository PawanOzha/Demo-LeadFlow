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
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-lf-shell-gradient-start to-lf-bg px-4">
      <div className="w-full max-w-[430px] rounded-[14px] border border-lf-border bg-lf-surface p-8 shadow-[0_8px_20px_var(--color-lf-card-shadow)]">
        <div className="text-center">
          <h1 className="text-[20px] font-bold tracking-tight text-lf-text">
            LeadFlow
          </h1>
          <p className="mt-1 text-[13px] font-normal text-lf-label">Sign in to continue</p>
        </div>
        <LoginForm />
      </div>
    </div>
  );
}
