"use client";

import { useEffect, useState } from "react";
import { Send } from "lucide-react";
import { requestTelegramLink, telegramLinkStatus } from "@/lib/api";

export function TelegramLinkDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [carregando, setCarregando] = useState(true);
  const [vinculado, setVinculado] = useState(false);
  const [codigo, setCodigo] = useState<string | null>(null);
  const [minutos, setMinutos] = useState(15);
  const [gerando, setGerando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setCodigo(null);
    setErro(null);
    setCarregando(true);
    telegramLinkStatus()
      .then(setVinculado)
      .catch(() => setErro("Não foi possível checar o status."))
      .finally(() => setCarregando(false));
  }, [open]);

  if (!open) return null;

  async function gerarCodigo() {
    setGerando(true);
    setErro(null);
    try {
      const resultado = await requestTelegramLink();
      setCodigo(resultado.code);
      setMinutos(resultado.expires_in_minutes);
    } catch {
      setErro("Não foi possível gerar o código.");
    } finally {
      setGerando(false);
    }
  }

  return (
    <div className="fixed inset-0 z-20 flex items-center justify-center bg-black/40 px-4">
      <div className="flex w-full max-w-sm flex-col items-center gap-3 rounded-3xl bg-surface p-6 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary">
          <Send size={22} className="text-primary-text" strokeWidth={2.3} />
        </div>
        <h2 className="font-heading text-xl text-ink">Telegram</h2>

        {carregando ? (
          <p className="py-4 text-sm text-ink-faint">Carregando...</p>
        ) : vinculado && !codigo ? (
          <>
            <p className="text-sm text-ink-muted">
              Seu Telegram já está vinculado. Códigos de redefinição de senha chegam no seu privado.
            </p>
            <button onClick={gerarCodigo} className="text-[13.5px] font-bold text-primary-strong">
              Vincular outro Telegram
            </button>
          </>
        ) : codigo ? (
          <>
            <p className="text-sm text-ink-muted">
              Envie esse código pro bot do dispensa.me no privado do Telegram (não no grupo da família):
            </p>
            <p className="font-heading text-5xl tracking-[0.15em] text-primary">{codigo}</p>
            <p className="text-xs text-ink-faint">Vale por {minutos} minutos.</p>
          </>
        ) : (
          <p className="text-sm text-ink-muted">
            Vincule seu Telegram pra poder recuperar a senha se esquecer — o código de reset chega no seu
            privado, não no grupo da família.
          </p>
        )}

        {erro && <p className="text-sm text-danger">{erro}</p>}

        {!carregando && !codigo && (
          <button
            onClick={vinculado ? onClose : gerarCodigo}
            disabled={gerando}
            className="w-full rounded-full bg-primary py-3 font-heading text-[15px] text-primary-text disabled:opacity-60"
          >
            {gerando ? "Gerando..." : vinculado ? "Fechar" : "Gerar código"}
          </button>
        )}
        {codigo && (
          <button onClick={onClose} className="w-full rounded-full bg-bg py-3 text-sm font-semibold text-ink">
            Fechar
          </button>
        )}
      </div>
    </div>
  );
}
