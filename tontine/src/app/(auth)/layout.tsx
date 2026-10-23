import Link from "next/link";
import { TontineLogo } from "@/components/brand/logo";
import { BrandCornerFlourish } from "@/components/brand/pattern";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-[var(--background)] px-4 py-12">
      <BrandCornerFlourish
        corner="top-right"
        className="pointer-events-none absolute right-0 top-0 h-28 w-28 sm:h-36 sm:w-36"
      />
      <BrandCornerFlourish
        corner="bottom-left"
        className="pointer-events-none absolute bottom-0 left-0 h-40 w-40 sm:h-52 sm:w-52"
      />
      <Link href="/" className="relative mb-8">
        <TontineLogo size="lg" />
      </Link>
      <div className="relative w-full max-w-md">{children}</div>
    </div>
  );
}
