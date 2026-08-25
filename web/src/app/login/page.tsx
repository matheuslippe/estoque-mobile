"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { requestPasswordReset } from "@/lib/api";

type Mode = "login" | "register" | "forgot-request" | "forgot-confirm";

function extrairErroRegistro(e: unknown): string {
  const data = (e as { response?: { data?: { username?: string[]; password?: string[] } } })?.response?.data;
  if (data?.username?.[0]) return data.username[0];
  if (data?.password?.[0]) return data.password[0];
  return "Não foi possível criar a conta. Tente novamente.";
}

function extrairErroReset(e: unknown): string {
  const data = (e as { response?: { data?: { code?: string[]; new_password?: string[] } } })?.response?.data;
  if (data?.code?.[0]) return data.code[0];
  if (data?.new_password?.[0]) return data.new_password[0];
  return "Não foi possível redefinir a senha. Tente novamente.";
}

const TITULOS: Record<Mode, string> = {
  login: "Entre com sua conta para continuar",
  register: "Crie sua conta pra começar",
  "forgot-request": "Informe seu usuário pra receber um código",
  "forgot-confirm": "Digite o código e a nova senha",
};

const BOTAO_LABEL: Record<Mode, string> = {
  login: "Entrar",
  register: "Criar conta",
  "forgot-request": "Enviar código",
  "forgot-confirm": "Redefinir senha",
};

export default function LoginPage() {
  const router = useRouter();
  const { signedIn, loading, login, register, confirmPasswordReset } = useAuth();
  const [mode, setMode] = useState<Mode>("login");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && signedIn) router.replace("/");
  }, [loading, signedIn, router]);

  function irPara(novoModo: Mode) {
    setMode(novoModo);
    setError(null);
    setInfo(null);
    setPassword("");
    setConfirmPassword("");
    setCode("");
    setNewPassword("");
    setConfirmNewPassword("");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (mode === "forgot-request") {
      if (!username.trim()) return;
      setSubmitting(true);
      setError(null);
      try {
        await requestPasswordReset(username.trim());
        setInfo("Se o usuário existir, o código chegou no Telegram da família.");
        setMode("forgot-confirm");
      } catch {
        setError("Não foi possível enviar o código. Tente novamente.");
      } finally {
        setSubmitting(false);
      }
      return;
    }

    if (mode === "forgot-confirm") {
      if (!code.trim() || !newPassword) return;
      if (newPassword !== confirmNewPassword) {
        setError("As senhas não coincidem.");
        return;
      }
      setSubmitting(true);
      setError(null);
      try {
        await confirmPasswordReset(username.trim(), code.trim(), newPassword);
        router.replace("/");
      } catch (err) {
        setError(extrairErroReset(err));
      } finally {
        setSubmitting(false);
      }
      return;
    }

    if (!username.trim() || !password) return;
    if (mode === "register" && password !== confirmPassword) {
      setError("As senhas não coincidem.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      if (mode === "login") {
        await login(username.trim(), password);
      } else {
        await register(username.trim(), password);
      }
      router.replace("/");
    } catch (err) {
      setError(mode === "login" ? "Usuário ou senha inválidos." : extrairErroRegistro(err));
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
          <p className="mt-1.5 text-ink-muted">{TITULOS[mode]}</p>
        </div>

        <div className="space-y-3">
          <input
            className="w-full rounded-full bg-surface px-5 py-3.5 text-sm text-ink outline-none placeholder:text-ink-faint disabled:opacity-60"
            placeholder="Usuário"
            autoComplete="username"
            disabled={mode === "forgot-confirm"}
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />

          {(mode === "login" || mode === "register") && (
            <input
              className="w-full rounded-full bg-surface px-5 py-3.5 text-sm text-ink outline-none placeholder:text-ink-faint"
              placeholder="Senha"
              type="password"
              autoComplete={mode === "login" ? "current-password" : "new-password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          )}
          {mode === "register" && (
            <input
              className="w-full rounded-full bg-surface px-5 py-3.5 text-sm text-ink outline-none placeholder:text-ink-faint"
              placeholder="Confirmar senha"
              type="password"
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />
          )}

          {mode === "forgot-confirm" && (
            <>
              <input
                className="w-full rounded-full bg-surface px-5 py-3.5 text-sm text-ink outline-none placeholder:text-ink-faint"
                placeholder="Código recebido no Telegram"
                inputMode="numeric"
                maxLength={6}
                value={code}
                onChange={(e) => setCode(e.target.value)}
              />
              <input
                className="w-full rounded-full bg-surface px-5 py-3.5 text-sm text-ink outline-none placeholder:text-ink-faint"
                placeholder="Nova senha"
                type="password"
                autoComplete="new-password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />
              <input
                className="w-full rounded-full bg-surface px-5 py-3.5 text-sm text-ink outline-none placeholder:text-ink-faint"
                placeholder="Confirmar nova senha"
                type="password"
                autoComplete="new-password"
                value={confirmNewPassword}
                onChange={(e) => setConfirmNewPassword(e.target.value)}
              />
            </>
          )}
        </div>

        {info && !error && <p className="text-sm text-secondary">{info}</p>}
        {error && <p className="text-sm text-danger">{error}</p>}

        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-full bg-primary py-3.5 font-heading text-base text-primary-text transition disabled:opacity-60"
        >
          {submitting ? "Aguarde..." : BOTAO_LABEL[mode]}
        </button>

        <div className="flex flex-col items-center gap-2 pt-1">
          {mode === "login" && (
            <button
              type="button"
              onClick={() => irPara("forgot-request")}
              className="text-[13.5px] font-bold text-primary-strong"
            >
              Esqueceu a senha?
            </button>
          )}
          <button
            type="button"
            onClick={() => irPara(mode === "login" ? "register" : "login")}
            className="text-[13.5px] text-ink-muted"
          >
            {mode === "login" && "Não tem conta? "}
            {mode === "register" && "Já tem conta? "}
            {(mode === "forgot-request" || mode === "forgot-confirm") && "Lembrou a senha? "}
            <span className="font-bold text-primary-strong">{mode === "login" ? "Criar uma" : "Entrar"}</span>
          </button>
        </div>
      </form>
    </div>
  );
}
