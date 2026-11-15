"use client";

import { useEffect, useRef, useState } from "react";
import { Input } from "./Input";
import { formatNumberRaw, parseNumberRaw, sanitizeNumberRaw } from "@/lib/ui/number-input";

export interface NumberFieldProps {
  label: string;
  value: number | null;
  onValueChange: (value: number | null) => void;
  unit?: string;
  hint?: string;
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
  step = 0.01,
  min,
  max,
  disabled,
  allowNegative = false,
  onFocus,
  onBlur,
  id,
}: NumberFieldProps) {
  const [raw, setRaw] = useState(() => formatNumberRaw(value));
  const focused = useRef(false);
  const hintId = hint ? `${id ?? label.replace(/\s+/g, "-").toLowerCase()}-hint` : undefined;

  useEffect(() => {
    if (!focused.current) setRaw(formatNumberRaw(value));
  }, [value]);

  return (
    <div className="field">
      <label htmlFor={id}>
        {label}
        {unit && <span className="mono muted"> · {unit}</span>}
      </label>
      <div className="number-field">
        <Input
          id={id}
          type="text"
          inputMode="decimal"
          value={raw}
          onChange={(event) => {
            const next = sanitizeNumberRaw(event.target.value, allowNegative);
            setRaw(next);
            onValueChange(parseNumberRaw(next));
          }}
          onFocus={(event) => {
            focused.current = true;
            if (raw === "0") event.currentTarget.select();
            onFocus?.();
          }}
          onBlur={() => {
            focused.current = false;
            const parsed = parseNumberRaw(raw);
            if (parsed !== null) setRaw(formatNumberRaw(parsed));
            onBlur?.();
          }}
          step={step}
          min={min}
          max={max}
          disabled={disabled}
          aria-label={label}
          aria-describedby={hintId}
        />
      </div>
      {hint && (
        <span className="field-hint muted small" id={hintId}>
          {hint}
        </span>
      )}
    </div>
  );
}
