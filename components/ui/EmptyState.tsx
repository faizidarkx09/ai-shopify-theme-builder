import type { ReactNode } from "react";
import { Card } from "./Card";

/* Wave 0 — EmptyState. Icon-free: one plain-language line plus one
   action. Used wherever a list / result is empty so later waves
   never invent a decorative illustration or a wall of copy. */

export function EmptyState({
  title,
  message,
  action,
  className = "",
}: {
  title: string;
  message: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <Card className={`text-center ${className}`.trim()}>
      <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
      <p className="mx-auto mt-1 max-w-md text-sm leading-relaxed text-slate-600">
        {message}
      </p>
      {action ? <div className="mt-4 flex justify-center">{action}</div> : null}
    </Card>
  );
}
