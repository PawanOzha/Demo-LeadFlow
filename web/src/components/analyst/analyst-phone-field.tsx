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
      className="[&_input]:min-h-11 [&_input]:w-full [&_input]:rounded-lg [&_input]:border [&_input]:border-lf-border [&_input]:bg-lf-bg [&_input]:px-3 [&_input]:py-2 [&_input]:text-sm [&_input]:text-lf-text"
    />
  );
}
