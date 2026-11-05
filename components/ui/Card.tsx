import type { ReactNode } from "react";

/* Wave 0 — Card. White surface, 1px #E2E8F0 border, rounded-2xl,
   soft shadow. The single panel style for the whole app chrome. */

type CardPadding = "default" | "compact" | "none";

const paddingClasses: Record<CardPadding, string> = {
  default: "p-5 sm:p-6",
  compact: "p-4",
  none: "p-0",
};

export function Card({
  title,
  description,
  padding = "default",
  children,
  className = "",
}: {
  title?: string;
  description?: string;
  padding?: CardPadding;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded-2xl border border-slate-200 bg-white shadow-sm ${paddingClasses[padding]} ${className}`.trim()}
    >
      {title ? (
        <h3 className="text-xl font-semibold text-slate-900">{title}</h3>
      ) : null}
      {description ? (
        <p className="mt-1 text-sm leading-relaxed text-slate-600">
          {description}
        </p>
      ) : null}
      <div className={title || description ? "mt-4" : ""}>{children}</div>
    </div>
  );
}
