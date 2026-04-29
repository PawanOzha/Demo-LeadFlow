"use client";

export function ConfirmSubmitButton({
  children,
  message,
  className,
  disabled,
}: {
  children: React.ReactNode;
  message: string;
  className?: string;
  disabled?: boolean;
}) {
  return (
    <button
      type="submit"
      disabled={disabled}
      className={className}
      onClick={(e) => {
        if (disabled) {
          e.preventDefault();
          return;
        }
        if (!confirm(message)) e.preventDefault();
      }}
    >
      {children}
    </button>
  );
}
