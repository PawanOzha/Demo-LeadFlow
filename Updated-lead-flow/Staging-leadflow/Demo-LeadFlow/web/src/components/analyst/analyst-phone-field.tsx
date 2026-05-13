"use client";

import PhoneInput from "react-phone-number-input";
import flags from "react-phone-number-input/flags";
import "react-phone-number-input/style.css";

export function AnalystPhoneField({
  value,
  onChange,
}: {
  value: string | undefined;
  onChange: (value: string | undefined) => void;
}) {
  return (
    <PhoneInput
      international
      defaultCountry="US"
      flags={flags}
      name="phone"
      required
      value={value}
      onChange={onChange}
      className="[&_.PhoneInputCountry]:mr-2 [&_input]:h-10 [&_input]:w-full [&_input]:rounded-lg [&_input]:border [&_input]:border-lf-border [&_input]:bg-lf-surface [&_input]:px-3 [&_input]:text-[13px] [&_input]:text-lf-text-secondary [&_input]:outline-none [&_input]:transition-shadow [&_input]:focus:border-transparent [&_input]:focus:ring-2 [&_input]:focus:ring-lf-brand/25"
    />
  );
}
