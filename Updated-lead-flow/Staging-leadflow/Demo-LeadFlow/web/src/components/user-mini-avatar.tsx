"use client";

import Image from "next/image";
import { AvatarInitialsCircle } from "@/components/avatar-initials-circle";
import { normalizeAvatarSrc, portalUserPhotoSrc } from "@/lib/avatar-url";

/** Compact circular avatar: uploaded photo or initials from name. */
export function UserMiniAvatar({
  userId,
  image,
  name,
  size = 26,
  className = "",
}: {
  userId: string;
  image: string | null | undefined;
  name?: string;
  size?: number;
  className?: string;
}) {
  const src = portalUserPhotoSrc(image);
  const imgSrc = src ? normalizeAvatarSrc(src) ?? src : null;

  if (!imgSrc) {
    return (
      <AvatarInitialsCircle
        userId={userId}
        name={name}
        size={size}
        className={className}
      />
    );
  }

  return (
    <span
      className={`inline-flex shrink-0 overflow-hidden rounded-full ring-1 ring-lf-border/25 ${className}`}
      style={{ width: size, height: size }}
      title={name}
    >
      <Image
        src={imgSrc}
        alt=""
        width={size}
        height={size}
        unoptimized
        className="h-full w-full object-cover"
      />
    </span>
  );
}

export function PersonWithMiniAvatar({
  id,
  name,
  image,
  size = 26,
}: {
  id: string;
  name: string;
  image: string | null;
  size?: number;
}) {
  return (
    <span className="inline-flex min-w-0 max-w-full items-center gap-2">
      <UserMiniAvatar userId={id} image={image} name={name} size={size} />
      <span className="min-w-0 truncate">{name}</span>
    </span>
  );
}
