import "server-only";

import { createClient } from "@supabase/supabase-js";

function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v) {
    throw new Error(`${name} must be set in the environment.`);
  }
  return v;
}

/** Server-only client with elevated privileges. Never import from client components. */
export function createSupabaseAdminClient() {
  const url = requireEnv("NEXT_PUBLIC_SUPABASE_URL");
  const serviceKey = requireEnv("SUPABASE_SERVICE_ROLE_KEY");
  return createClient(url, serviceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

export async function authAdminCreateUser(email: string, password: string) {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase.auth.admin.createUser({
    email: email.trim().toLowerCase(),
    password,
    email_confirm: true,
  });
  if (error) throw new Error(error.message);
  if (!data.user?.id) throw new Error("Auth user was not created.");
  return data.user.id;
}

export async function authAdminDeleteUser(authUserId: string) {
  const supabase = createSupabaseAdminClient();
  const { error } = await supabase.auth.admin.deleteUser(authUserId);
  if (error) throw new Error(error.message);
}

export async function authAdminUpdatePassword(
  authUserId: string,
  password: string,
) {
  const supabase = createSupabaseAdminClient();
  const { error } = await supabase.auth.admin.updateUserById(authUserId, {
    password,
  });
  if (error) throw new Error(error.message);
}
