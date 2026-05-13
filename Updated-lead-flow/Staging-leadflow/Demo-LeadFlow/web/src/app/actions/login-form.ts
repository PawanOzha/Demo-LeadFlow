"use server";

import { loginAction } from "@/app/actions/auth";

export async function loginFormAction(
  _prev: { error?: string } | undefined,
  formData: FormData,
): Promise<{ error?: string } | undefined> {
  const result = await loginAction(formData);
  if (result && "error" in result) return result;
  return undefined;
}
