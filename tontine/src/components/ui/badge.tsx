import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
  {
    variants: {
      variant: {
        default: "bg-[var(--brand-emerald)]/12 text-[var(--brand-emerald)]",
        secondary: "bg-[var(--brand-gold)]/15 text-[var(--brand)]",
        outline: "border border-[var(--brand)]/25 text-[var(--brand)]",
        destructive: "bg-red-100 text-red-800",
        warning: "bg-amber-100 text-amber-800",
        neutral: "bg-stone-100 text-stone-700",
      },
    },
    defaultVariants: { variant: "default" },
  }
);

function Badge({
  className,
  variant,
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & VariantProps<typeof badgeVariants>) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
