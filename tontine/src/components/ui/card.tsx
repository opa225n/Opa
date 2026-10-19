import * as React from "react";
import { cn } from "@/lib/utils";

function Card({
  className,
  accent,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & { accent?: boolean }) {
  return (
    <div
      className={cn(
        "rounded-xl border border-[var(--brand)]/12 bg-white shadow-[0_1px_3px_rgba(6,61,50,0.08)]",
        accent && "border-t-[3px] border-t-[var(--brand-gold)]",
        className
      )}
      {...props}
    />
  );
}

function CardHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("flex flex-col gap-1 p-5", className)} {...props} />;
}

function CardTitle({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3 className={cn("font-display text-base font-semibold text-[var(--foreground)]", className)} {...props} />
  );
}

function CardDescription({ className, ...props }: React.HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cn("text-sm text-stone-500", className)} {...props} />;
}

function CardContent({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("p-5 pt-0", className)} {...props} />;
}

function CardFooter({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("flex items-center gap-2 p-5 pt-0", className)} {...props} />;
}

export { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter };
