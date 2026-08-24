"""Interpretacao de texto/audio via Gemini - modulo reutilizavel (nao depende
do Telegram), extraido do bot original pra poder ser testado e chamado de
qualquer lugar.

Usa o SDK atual `google-genai` (o antigo `google-generativeai` foi
descontinuado)."""

from __future__ import annotations

import json

from django.conf import settings
from google import genai

MODELO = "gemini-flash-latest"

PROMPT_SISTEMA = """
Voce e um assistente de controle de estoque domestico.
Recebe uma mensagem de um usuario (texto ou audio transcrito) e extrai:

1. acao: "ENTRADA" (comprar/adicionar/repor), "SAIDA" (retirar/usar/acabou),
   "EDITAR" (renomear) ou "LISTA" (ver o que esta faltando).
2. item: nome do item mencionado (string vazia na acao LISTA).
3. qtd: quantidade mencionada (padrao 1; use 0 em EDITAR e LISTA).
4. categoria: categoria curta caso o item ainda nao exista
   (ex: "Comida", "Limpeza", "Bebida", "Higiene", "Geral").
5. novo_nome: preencher APENAS quando acao for "EDITAR".

Responda EXCLUSIVAMENTE com JSON puro, sem markdown:
{"acao": "EDITAR", "item": "Arroz", "qtd": 0, "categoria": "Comida", "novo_nome": "Arroz Integral"}
"""

_client: genai.Client | None = None


def _cliente() -> genai.Client:
    global _client
    if _client is None:
        if not settings.GEMINI_API_KEY:
            raise RuntimeError("GEMINI_API_KEY nao configurada (backend/.env).")
        _client = genai.Client(api_key=settings.GEMINI_API_KEY)
    return _client


def _extrair_json(texto: str) -> dict:
    limpo = texto.replace("```json", "").replace("```", "").strip()
    dados = json.loads(limpo)
    if not isinstance(dados, dict):
        raise ValueError("resposta nao e um objeto JSON")
    return dados


def interpretar(entrada) -> dict:
    """`entrada` pode ser uma string (texto) ou um File ja enviado ao Gemini
    (audio, via `interpretar_audio`)."""
    resposta = _cliente().models.generate_content(
        model=MODELO,
        contents=[PROMPT_SISTEMA, entrada],
    )
    return _extrair_json(resposta.text)


def interpretar_audio(caminho: str) -> dict:
    cliente = _cliente()
    arquivo = cliente.files.upload(file=caminho)
    try:
        return interpretar(arquivo)
    finally:
        try:
            cliente.files.delete(name=arquivo.name)
        except Exception as e:
            print(f"[bots.gemini] nao consegui apagar o arquivo remoto: {e}")
