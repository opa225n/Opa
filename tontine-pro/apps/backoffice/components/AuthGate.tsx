"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getAdminToken } from "@/lib/api";
import { Sidebar } from "./Sidebar";

export function AuthGate({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!getAdminToken()) {
      router.replace("/login");
    } else {
      setReady(true);
    }
  }, [router]);

  if (!ready) return null;

  const isProd = process.env.NEXT_PUBLIC_ENV === "production";

  return (
    <div className="shell">
      <Sidebar />
      <div className="content">
        {isProd && <div className="env-banner">ENVIRONNEMENT DE PRODUCTION — toute action est journalisée</div>}
        <div className="content-inner">{children}</div>
      </div>
    </div>
  );
}
