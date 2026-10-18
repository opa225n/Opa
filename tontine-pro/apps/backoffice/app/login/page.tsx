"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { adminApi, setAdminSession, AdminApiError } from "@/lib/api";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("admin@tontine.local");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await adminApi.post("/auth/login", { email, password });
      setAdminSession(res.accessToken, res.admin);
      router.push("/");
    } catch (err) {
      if (err instanceof AdminApiError) {
        setError(err.debug ? `${err.message} — ${JSON.stringify(err.debug)}` : err.message);
      } else {
        setError("Connexion impossible.");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login-shell">
      <form className="login-card" onSubmit={submit}>
        <h1 className="page-title">Tontine — Back-office</h1>
        <p className="page-subtitle">Accès réservé à l'équipe interne.</p>
        {error && <div className="error-text">{error}</div>}
        <div className="field">
          <label>E-mail</label>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </div>
        <div className="field">
          <label>Mot de passe</label>
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        </div>
        <button className="btn btn-primary" style={{ width: "100%" }} disabled={loading}>
          {loading ? "Connexion…" : "Se connecter"}
        </button>
        <p className="page-subtitle" style={{ marginTop: 16, marginBottom: 0, fontSize: 12 }}>
          2FA non implémentée dans cette démo (prévue au TRD — voir README).
        </p>
      </form>
    </div>
  );
}
