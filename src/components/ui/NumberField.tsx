"use client";

import type { ChangeEventHandler } from "react";
import { Input } from "./Input";

export interface NumberFieldProps {
  label: string;
  value: number | string;
  onChange: ChangeEventHandler<HTMLInputElement>;
  unit?: string;
  step?: number | string;
  min?: number;
  max?: number;
  disabled?: boolean;
}

export function NumberField({
  label,
  value,
  onChange,
  unit,
  step = 0.01,
  min = 0,
  max,
  disabled,
}: NumberFieldProps) {
  return (
    <div className="field">
      <label>
        {label}
        {unit && <span className="mono muted"> · {unit}</span>}
      </label>
      <div className="number-field">
        <Input
          type="number"
          value={value}
          onChange={onChange}
          step={step}
          min={min}
          max={max}
          disabled={disabled}
          aria-label={label}
        />
      </div>
    </div>
  );
}
