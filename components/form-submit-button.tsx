"use client";

import type { ReactNode } from "react";
import { useFormStatus } from "react-dom";

type FormSubmitButtonProps = {
  children: ReactNode;
  className: string;
  disabled?: boolean;
  pendingLabel?: string;
};

export function FormSubmitButton({
  children,
  className,
  disabled = false,
  pendingLabel = "Memproses...",
}: FormSubmitButtonProps) {
  const { pending } = useFormStatus();

  return (
    <button
      className={className}
      disabled={disabled || pending}
      type="submit"
    >
      {pending ? pendingLabel : children}
    </button>
  );
}
