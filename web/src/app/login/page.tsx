"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";

export default function LoginPage() {
  const router = useRouter();
  const { signedIn, loading, login } = useAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && signedIn) router.replace("/");
  }, [loading, signedIn, router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!username.trim() || !password) return;
    setSubmitting(true);
    setError(null);
    try {
      await login(username.trim(), password);
      router.replace("/");
    } catch {
      setError("Usuário ou senha inválidos.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-1 items-center justify-center bg-bg px-6">
      <form onSubmit={handleSubmit} className="w-full max-w-sm space-y-5">
        <div>
          <Image src="/icon-192.png" alt="" width={48} height={48} className="mb-3.5 rounded-2xl" />
          <h1 className="font-heading text-4xl text-ink">dispensa.me</h1>
          <p className="mt-1.5 text-ink-muted">Entre com sua conta para continuar</p>
        </div>

        <div className="space-y-3">
          <input
            className="w-full rounded-full bg-surface px-5 py-3.5 text-sm text-ink outline-none placeholder:text-ink-faint"
            placeholder="Usuário"
            autoComplete="username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />
          <input
            className="w-full rounded-full bg-surface px-5 py-3.5 text-sm text-ink outline-none placeholder:text-ink-faint"
            placeholder="Senha"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>

        {error && <p className="text-sm text-danger">{error}</p>}

        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-full bg-primary py-3.5 font-heading text-base text-primary-text transition disabled:opacity-60"
        >
          {submitting ? "Entrando..." : "Entrar"}
        </button>
      </form>
    </div>
  );
}
