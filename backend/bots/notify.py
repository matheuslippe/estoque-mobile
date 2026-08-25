"""Avisos proativos pro Telegram - chamado tanto pelo bot quanto pela API
(ex.: quando um item bate o minimo por causa de uma retirada feita no app).
"""

from __future__ import annotations

import requests
from django.conf import settings

from .formatting import escapar_markdown

TELEGRAM_API = "https://api.telegram.org"


def _enviar_para(chat_id: str, texto: str, parse_mode: str | None) -> None:
    if not settings.TELEGRAM_BOT_TOKEN:
        return
    url = f"{TELEGRAM_API}/bot{settings.TELEGRAM_BOT_TOKEN}/sendMessage"
    try:
        requests.post(
            url,
            json={"chat_id": chat_id, "text": texto, "parse_mode": parse_mode},
            timeout=10,
        )
    except requests.RequestException as e:
        print(f"[bots.notify] falha ao enviar pro chat {chat_id}: {e}")


def enviar_telegram(texto: str, parse_mode: str | None = "Markdown") -> None:
    """Manda pra todos os chats em TELEGRAM_CHAT_IDS (o(s) grupo(s) da familia)."""
    if not settings.TELEGRAM_CHAT_IDS:
        return
    for chat_id in settings.TELEGRAM_CHAT_IDS:
        _enviar_para(chat_id, texto, parse_mode)


def enviar_telegram_dm(chat_id: str, texto: str, parse_mode: str | None = "Markdown") -> None:
    """Manda pra um chat_id especifico (ex.: DM pessoal vinculado a um usuario),
    nao pro grupo compartilhado."""
    _enviar_para(chat_id, texto, parse_mode)


def avisar_nivel_minimo(item: dict) -> None:
    """`item` no formato do ItemSerializer (nome, qtd, qtd_minima, status)."""
    nome = escapar_markdown(item["nome"])
    situacao = "zerado" if item["status"] == "zerado" else "no nivel minimo"
    enviar_telegram(
        f"⚠️ *{nome}* esta {situacao} ({item['qtd']} un.). Entrou na lista de compras."
    )
