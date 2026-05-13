import {
  displayInitials,
  initialsAvatarPaletteClass,
} from "@/lib/avatar-url";

/** Circular initials avatar when the user has no uploaded photo. */
export function AvatarInitialsCircle({
  userId,
  name,
  size,
  className = "",
}: {
  userId: string;
  name?: string | null;
  size: number;
  className?: string;
}) {
  const initials = displayInitials(name, userId);
  const palette = initialsAvatarPaletteClass(userId);
  const fontSizeClass =
    size >= 96
      ? "text-3xl"
      : size >= 72
        ? "text-2xl"
        : size >= 44
          ? "text-base"
          : size >= 32
            ? "text-xs"
            : "text-[10px]";

  return (
    <span
      className={`inline-flex shrink-0 select-none items-center justify-center rounded-full font-semibold leading-none tracking-tight ${palette} ${fontSizeClass} ${className}`}
      style={{ width: size, height: size, minWidth: size, minHeight: size }}
      title={name?.trim() || undefined}
    >
      {initials}
    </span>
  );
}
