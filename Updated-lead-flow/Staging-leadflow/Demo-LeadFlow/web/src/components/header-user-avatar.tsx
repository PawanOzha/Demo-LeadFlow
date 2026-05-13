import Image from "next/image";
import { AvatarInitialsCircle } from "@/components/avatar-initials-circle";
import { normalizeAvatarSrc, portalUserPhotoSrc } from "@/lib/avatar-url";

/** Header profile: circular photo or initials. */
export function HeaderUserAvatar({
  userId,
  name,
  image,
}: {
  userId: string;
  name: string;
  image: string | null | undefined;
}) {
  const src = portalUserPhotoSrc(image);
  const imgSrc = src ? normalizeAvatarSrc(src) ?? src : null;

  if (!imgSrc) {
    return <AvatarInitialsCircle userId={userId} name={name} size={32} />;
  }

  return (
    <span
      className="inline-flex h-8 w-8 shrink-0 overflow-hidden rounded-full ring-1 ring-lf-border/25"
      title={name}
    >
      <Image
        src={imgSrc}
        alt=""
        width={32}
        height={32}
        unoptimized
        className="h-full w-full object-cover"
      />
    </span>
  );
}
