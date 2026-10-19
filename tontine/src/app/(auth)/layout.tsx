import Link from "next/link";
import { TontineLogo } from "@/components/brand/logo";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[var(--background)] px-4 py-12">
      <Link href="/" className="mb-8">
        <TontineLogo size="lg" />
      </Link>
      <div className="w-full max-w-md">{children}</div>
    </div>
  );
}
