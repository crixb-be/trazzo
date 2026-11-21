"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Input } from "./Input";
import { formatNumberRaw, validateNumberRaw } from "@/lib/ui/number-input";

export interface NumberFieldProps {
  label: string;
  value: number | null;
  onValueChange: (value: number | null, empty: boolean) => void;
  unit?: string;
  hint?: string;
  error?: string;
  placeholder?: string;
  step?: number | string;
  min?: number;
  max?: number;
  disabled?: boolean;
  allowNegative?: boolean;
  onFocus?: () => void;
  onBlur?: () => void;
  id?: string;
}

export function NumberField({
  label,
  value,
  onValueChange,
  unit,
  hint,
  error,
  placeholder,
  min,
  max,
  disabled,
  allowNegative = false,
  onFocus,
  onBlur,
  id,
}: NumberFieldProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const [raw, setRaw] = useState(() => formatNumberRaw(value));
  const emitted = useRef(value);
  const focused = useRef(false);
  const validate = (text: string) => validateNumberRaw(text, { allowNegative, min, max });
  const message = validate(raw).error ?? error;

  useEffect(() => {
    if (Object.is(value, emitted.current) || focused.current) return;
    emitted.current = value;
    setRaw(formatNumberRaw(value));
  }, [value]);

  return (
    <div className="field">
      <label htmlFor={inputId}>
        {label}
        {unit && (
          <span aria-hidden="true" className="mono muted">
            {" "}
            · {unit}
          </span>
        )}
      </label>
      <div className="number-field">
        <Input
          id={inputId}
          type="text"
          inputMode="decimal"
          value={raw}
          placeholder={placeholder}
          onChange={(event) => {
            const next = event.target.value;
            const parsed = validate(next);
            setRaw(next);
            emitted.current = parsed.value;
            onValueChange(parsed.value, next === "");
          }}
          onFocus={(event) => {
            focused.current = true;
            if (raw === "0") event.currentTarget.select();
            onFocus?.();
          }}
          onBlur={() => {
            focused.current = false;
            onBlur?.();
          }}
          disabled={disabled}
          aria-invalid={message ? true : undefined}
          aria-describedby={
            [unit && inputId + "-unit", hint && inputId + "-hint", message && inputId + "-error"]
              .filter(Boolean)
              .join(" ") || undefined
          }
        />
      </div>
      {unit && (
        <span className="sr-only" id={inputId + "-unit"}>
          Unidad: {unit}
        </span>
      )}
      {hint && (
        <span className="field-hint muted small" id={inputId + "-hint"}>
          {hint}
        </span>
      )}
      {message && (
        <span className="field-error small" id={inputId + "-error"}>
          {message}
        </span>
      )}
    </div>
  );
}
