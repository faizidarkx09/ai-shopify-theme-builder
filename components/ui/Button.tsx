import type {
  AnchorHTMLAttributes,
  ButtonHTMLAttributes,
  ReactNode,
} from "react";

/* Wave 0 — Button. ONE primary style + ONE ghost style, nothing else.
   Primary: indigo #4F46E5 bg, white text, rounded-lg, px-5 py-3,
   semibold, min touch target 44px. Ghost: white bg, slate border,
   slate text. No pink, no black, no other button colours anywhere. */

export type ButtonVariant = "primary" | "ghost";
export type ButtonSize = "sm" | "md";

const baseClasses =
  "inline-flex items-center justify-center gap-2 rounded-lg font-semibold " +
  "transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 " +
  "focus-visible:outline-indigo-600 disabled:pointer-events-none disabled:opacity-50";

const variantClasses: Record<ButtonVariant, string> = {
  primary: "bg-indigo-600 text-white hover:bg-indigo-700",
  ghost:
    "border border-slate-300 bg-white text-slate-700 hover:border-slate-400 hover:bg-slate-50",
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: "min-h-11 px-4 py-2 text-sm",
  md: "min-h-11 px-5 py-3 text-base",
};

type ButtonProps = {
  variant?: ButtonVariant;
  size?: ButtonSize;
  href?: string;
  children: ReactNode;
  className?: string;
} & Omit<ButtonHTMLAttributes<HTMLButtonElement>, "className"> &
  Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "className" | "href">;

export function Button({
  variant = "primary",
  size = "md",
  href,
  children,
  className = "",
  type = "button",
  ...rest
}: ButtonProps) {
  const classes =
    `${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${className}`.trim();
  if (href) {
    const { ...anchorRest } = rest as AnchorHTMLAttributes<HTMLAnchorElement>;
    return (
      <a href={href} className={classes} {...anchorRest}>
        {children}
      </a>
    );
  }
  return (
    <button type={type} className={classes} {...rest}>
      {children}
    </button>
  );
}
