"use client";

import { atlSetManagedMemberPasswordFormAction } from "@/app/actions/atl";
import { ManagedMemberPasswordModalTrigger } from "@/components/portal-managed-member-password-modal";

export function AtlPasswordForm({
  userId,
  memberName,
  mustResetPassword = false,
}: {
  userId: string;
  memberName: string;
  mustResetPassword?: boolean;
}) {
  return (
    <ManagedMemberPasswordModalTrigger
      userId={userId}
      memberLabel={memberName}
      mustResetPassword={mustResetPassword}
      formAction={atlSetManagedMemberPasswordFormAction}
    />
  );
}
