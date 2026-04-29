"use client";

import { useActionState } from "react";
import { superadminDeleteUserFormAction } from "@/app/actions/superadmin";
import { ConfirmSubmitButton } from "@/components/superadmin/confirm-submit-button";

export function SuperadminDeleteForm({
  userId,
  email,
}: {
  userId: string;
  email: string;
}) {
  const [state, action, pending] = useActionState(
    superadminDeleteUserFormAction,
    undefined,
  );

  return (
    <form action={action} className="space-y-1">
      <input type="hidden" name="userId" value={userId} />
      {state?.error ? (
        <p className="max-w-[200px] text-xs text-lf-danger" role="alert">
          {state.error}
        </p>
      ) : null}
      <ConfirmSubmitButton
        message={`Delete user ${email}? This cannot be undone.`}
        disabled={pending}
        className="h-9 rounded-lg bg-red-500 px-4 text-[13px] font-medium text-white transition-colors hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:opacity-40"
      >
        {pending ? "…" : "Delete"}
      </ConfirmSubmitButton>
    </form>
  );
}
