"use client";

import { mtlSetSalesExecutivePasswordFormAction } from "@/app/actions/mtl";
import { ManagedMemberPasswordModalTrigger } from "@/components/portal-managed-member-password-modal";

export function MtlSalesExecPasswordForm({
  execId,
  execName,
  mustResetPassword = false,
}: {
  execId: string;
  execName: string;
  mustResetPassword?: boolean;
}) {
  return (
    <ManagedMemberPasswordModalTrigger
      userId={execId}
      memberLabel={execName}
      mustResetPassword={mustResetPassword}
      formAction={mtlSetSalesExecutivePasswordFormAction}
    />
  );
}
