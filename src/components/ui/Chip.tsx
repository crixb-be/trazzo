"use client";

import type { ButtonHTMLAttributes } from "react";

export interface ChipProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  active?: boolean;
}

export function Chip({ active = false, className = "", ...props }: ChipProps) {
  return (
    <button type="button" className={"chip " + (active ? "active " : "") + className} {...props} />
  );
}
