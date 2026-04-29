import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { dbQueryOne } from "@/lib/db/pool";
import { homePathForRole } from "@/lib/role-home";
import { ResetPasswordForm } from "./reset-password-form";

export default async function ResetPasswordPage() {
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }

  const user = await dbQueryOne<{ mustResetPassword: boolean }>(
    `SELECT "mustResetPassword" FROM "User" WHERE id = $1`,
    [session.id],
  );

  if (!user?.mustResetPassword) {
    redirect(homePathForRole(session.role) ?? "/login");
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-[#0052cc] via-[#0066ff] to-[#0052cc] px-4">
      <div className="w-full max-w-md rounded-2xl border border-white/20 bg-white p-8 shadow-2xl shadow-black/25 ring-1 ring-white/30">
        <div className="text-center">
          <h1 className="text-[22px] font-semibold tracking-tight text-gray-900">
            Set a new password
          </h1>
          <p className="mt-1 text-[13px] font-normal text-gray-600">
            Your account requires a new password before continuing.
          </p>
        </div>
        <ResetPasswordForm />
      </div>
    </div>
  );
}
