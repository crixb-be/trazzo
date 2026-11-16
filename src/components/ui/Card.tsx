import type { HTMLAttributes } from "react";

export interface CardProps extends HTMLAttributes<HTMLElement> {
  as?: "section" | "article" | "div";
}

export function Card({ as = "section", className = "", ...props }: CardProps) {
  const Element = as;
  return <Element className={"card " + className} {...props} />;
}
