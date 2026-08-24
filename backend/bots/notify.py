"""Avisos proativos pro Telegram - chamado tanto pelo bot quanto pela API
(ex.: quando um item bate o minimo por causa de uma retirada feita no app).
"""

from __future__ import annotations

import requests
from django.conf import settings

from .formatting import escapar_markdown

TELEGRAM_API = "https://api.telegram.org"


def enviar_telegram(texto: str, parse_mode: str | None = "Markdown") -> None:
    if not settings.TELEGRAM_BOT_TOKEN or not settings.TELEGRAM_CHAT_IDS:
        return
    url = f"{TELEGRAM_API}/bot{settings.TELEGRAM_BOT_TOKEN}/sendMessage"
    for chat_id in settings.TELEGRAM_CHAT_IDS:
        try:
            requests.post(
                url,
                json={"chat_id": chat_id, "text": texto, "parse_mode": parse_mode},
                timeout=10,
            )
        except requests.RequestException as e:
            print(f"[bots.notify] falha ao enviar pro chat {chat_id}: {e}")


def avisar_nivel_minimo(item: dict) -> None:
    """`item` no formato do ItemSerializer (nome, qtd, qtd_minima, status)."""
    nome = escapar_markdown(item["nome"])
    situacao = "zerado" if item["status"] == "zerado" else "no nivel minimo"
    enviar_telegram(
        f"⚠️ *{nome}* esta {situacao} ({item['qtd']} un.). Entrou na lista de compras."
    )
