import "server-only";

import { revalidatePath } from "next/cache";
import { existsSync } from "fs";
import { mkdir, unlink, writeFile } from "fs/promises";
import path from "path";
import { dbQuery, dbQueryOne } from "@/lib/db/pool";
import { getSession } from "@/lib/auth/session";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { UserRole } from "@/lib/constants";

export type PortalSettingsResult =
  | { error: string; ok?: undefined }
  | { ok: true; image?: string | null; error?: undefined };

function portalSettingsRoles() {
  return [
    UserRole.LEAD_ANALYST,
    UserRole.ANALYST_TEAM_LEAD,
    UserRole.MAIN_TEAM_LEAD,
    UserRole.SALES_EXECUTIVE,
    UserRole.SUPERADMIN,
  ] as const;
}

export function canUsePortalSettings(role: string | undefined) {
  return (portalSettingsRoles() as readonly string[]).includes(role ?? "");
}

async function revalidatePortalLayouts() {
  revalidatePath("/analyst", "layout");
  revalidatePath("/analyst-team-lead", "layout");
  revalidatePath("/team-lead", "layout");
  revalidatePath("/executive", "layout");
  revalidatePath("/superadmin", "layout");
}

async function deleteAvatarFilesOnDisk(userId: string) {
  const cwd = process.cwd();
  for (const ext of ["jpg", "png"] as const) {
    const priv = path.join(cwd, "private-uploads", `${userId}.${ext}`);
    if (existsSync(priv)) await unlink(priv).catch(() => {});
    const legacy = path.join(cwd, "public", "uploads", `${userId}.${ext}`);
    if (existsSync(legacy)) await unlink(legacy).catch(() => {});
  }
}

async function deleteOtherAvatarExtension(userId: string, keepExt: "jpg" | "png") {
  const other = keepExt === "jpg" ? "png" : "jpg";
  const cwd = process.cwd();
  for (const base of [
    path.join(cwd, "private-uploads"),
    path.join(cwd, "public", "uploads"),
  ]) {
    const p = path.join(base, `${userId}.${other}`);
    if (existsSync(p)) await unlink(p).catch(() => {});
  }
}

export async function runPortalProfileUpdate(
  formData: FormData,
): Promise<PortalSettingsResult> {
  const session = await getSession();
  if (!session || !canUsePortalSettings(session.role)) {
    return { error: "Unauthorized." };
  }

  const name = String(formData.get("name") ?? "").trim();
  if (!name) return { error: "Name is required." };

  const user = await dbQueryOne<{ id: string }>(
    `SELECT id FROM "User" WHERE id = $1`,
    [session.id],
  );
  if (!user) return { error: "User not found." };

  const removePhoto = formData.get("removePhoto") === "true";
  const file = formData.get("photo");
  const hasNewFile = file instanceof File && file.size > 0;

  let imageUpdate: string | null | undefined = undefined;

  if (hasNewFile) {
    const ext =
      file.type === "image/png"
        ? "png"
        : file.type === "image/jpeg"
          ? "jpg"
          : null;
    if (!ext) return { error: "Photo must be JPEG or PNG." };
    const buf = Buffer.from(await file.arrayBuffer());
    const dir = path.join(process.cwd(), "private-uploads");
    await mkdir(dir, { recursive: true });
    await writeFile(path.join(dir, `${session.id}.${ext}`), buf);
    imageUpdate = `/api/avatar?ext=${ext}`;
    await deleteOtherAvatarExtension(session.id, ext);
  } else if (removePhoto) {
    await deleteAvatarFilesOnDisk(session.id);
    imageUpdate = null;
  }

  if (imageUpdate !== undefined) {
    await dbQuery(
      `UPDATE "User" SET name = $1, image = $2, "updatedAt" = CURRENT_TIMESTAMP WHERE id = $3`,
      [name, imageUpdate, session.id],
    );
  } else {
    await dbQuery(
      `UPDATE "User" SET name = $1, "updatedAt" = CURRENT_TIMESTAMP WHERE id = $2`,
      [name, session.id],
    );
  }

  const fresh = await dbQueryOne<{ image: string | null }>(
    `SELECT image FROM "User" WHERE id = $1`,
    [session.id],
  );

  try {
    await revalidatePortalLayouts();
  } catch {
    // revalidatePath can throw outside a full request lifecycle in edge cases.
  }
  return { ok: true as const, image: fresh?.image ?? null };
}

export async function runPortalPasswordUpdate(
  formData: FormData,
): Promise<PortalSettingsResult> {
  const session = await getSession();
  if (!session || !canUsePortalSettings(session.role)) {
    return { error: "Unauthorized." };
  }

  const currentPassword = String(formData.get("currentPassword") ?? "");
  const nextPassword = String(formData.get("newPassword") ?? "").trim();

  if (!nextPassword) return { error: "New password is required." };
  if (nextPassword.length < 8) {
    return { error: "New password must be at least 8 characters." };
  }
  if (!currentPassword) {
    return { error: "Enter your current password." };
  }

  const user = await dbQueryOne<{
    email: string;
    authUserId: string | null;
  }>(
    `SELECT email, "authUserId" FROM "User" WHERE id = $1`,
    [session.id],
  );
  if (!user) return { error: "User not found." };
  if (!user.authUserId) {
    return {
      error:
        "This account is not linked to Supabase Auth. Contact an administrator.",
    };
  }

  const supabase = await createSupabaseServerClient();
  const { error: verifyErr } = await supabase.auth.signInWithPassword({
    email: user.email,
    password: currentPassword,
  });
  if (verifyErr) {
    return { error: "Current password is incorrect." };
  }

  const { error: updateErr } = await supabase.auth.updateUser({
    password: nextPassword,
  });
  if (updateErr) {
    console.error("[runPortalPasswordUpdate] Supabase update:", updateErr);
    return { error: "Something went wrong. Please try again." };
  }

  await dbQuery(
    `UPDATE "User"
     SET "passwordHash" = $1, "mustResetPassword" = false, "updatedAt" = CURRENT_TIMESTAMP
     WHERE id = $2`,
    [nextPassword, session.id],
  );

  try {
    await revalidatePortalLayouts();
  } catch {
    // ignore
  }
  return { ok: true as const };
}
