"use client";

import type { ComponentPropsWithRef } from "react";

export function Input({ className = "", ...props }: ComponentPropsWithRef<"input">) {
  return <input className={"input " + className} {...props} />;
}
