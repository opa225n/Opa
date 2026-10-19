import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-medium transition-colors disabled:pointer-events-none disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand)] focus-visible:ring-offset-2",
  {
    variants: {
      variant: {
        default: "bg-[var(--brand)] text-white hover:bg-[#2a0f24]",
        destructive: "bg-red-600 text-white hover:bg-red-700",
        outline: "border border-[var(--brand)]/25 bg-white text-[var(--brand)] hover:bg-[var(--brand)]/5",
        ghost: "hover:bg-stone-100 text-stone-900",
        link: "text-[var(--brand)] underline-offset-4 hover:underline",
        secondary: "border border-[var(--brand-gold)] bg-[var(--brand-gold)]/10 text-[var(--brand)] hover:bg-[var(--brand-gold)]/20",
      },
      size: {
        default: "h-11 px-4 py-2",
        sm: "h-9 px-3 text-sm",
        lg: "h-12 px-6 text-base",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: { variant: "default", size: "default" },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => (
    <button ref={ref} className={cn(buttonVariants({ variant, size, className }))} {...props} />
  )
);
Button.displayName = "Button";

export { Button, buttonVariants };
