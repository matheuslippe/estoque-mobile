"""Bot do Telegram: registra movimentacoes de estoque por texto ou audio.

Diferenca pro bot original: aqui ele fala com a API Django (`api_client.py`)
em vez de importar `db.py`/os models direto. A regra de negocio mora so na
API agora - o bot e so mais um cliente dela, igual o app mobile.
"""

from __future__ import annotations

import os
import re
import tempfile

from django.conf import settings
from telegram import Update
from telegram.ext import Application, ContextTypes, MessageHandler, filters

from .api_client import ApiError, EstoqueApiClient
from .formatting import escapar_markdown, texto_lista_compras
from .gemini import interpretar, interpretar_audio

cliente = EstoqueApiClient()


def _primeiro_erro(e: ApiError) -> str | None:
    payload = e.payload
    if "detail" in payload:
        return str(payload["detail"])
    for valor in payload.values():
        if isinstance(valor, list) and valor:
            return str(valor[0])
    return None


def buscar_item(itens: list[dict], nome: str) -> dict | None:
    """Casamento exato primeiro; so depois aproximado (mesma regra do bot
    original, so que sobre a lista vinda da API em vez do SQLite)."""
    alvo = " ".join(nome.lower().strip().split())
    if not alvo:
        return None

    for it in itens:
        if it["nome"].lower() == alvo:
            return it

    candidatos = [it for it in itens if alvo in it["nome"].lower() or it["nome"].lower() in alvo]
    if not candidatos:
        return None
    return min(candidatos, key=lambda it: abs(len(it["nome"]) - len(alvo)))


def autorizado(update: Update) -> bool:
    if not settings.TELEGRAM_CHAT_IDS:
        return True
    return str(update.effective_chat.id) in settings.TELEGRAM_CHAT_IDS


async def executar(msg, dados: dict) -> None:
    acao = str(dados.get("acao", "")).upper()
    nome = str(dados.get("item") or "").strip()
    try:
        qtd = max(1, int(dados.get("qtd") or 1))
    except (TypeError, ValueError):
        qtd = 1

    if acao == "LISTA":
        texto = texto_lista_compras(cliente.lista_compras())
        await msg.edit_text(
            texto or "🛒 *Lista de Compras*\n\nTudo certo, nada faltando. 🎉",
            parse_mode="Markdown",
        )
        return

    if not nome:
        await msg.edit_text("❌ Nao identifiquei qual item voce quis dizer.")
        return

    item = buscar_item(cliente.listar_itens(), nome)

    if acao == "EDITAR":
        novo = str(dados.get("novo_nome") or "").strip()
        if not item or not novo:
            await msg.edit_text(f"❌ Nao consegui renomear. '{nome}' existe no estoque?")
            return
        try:
            atualizado = cliente.renomear_item(item["id"], novo)
        except ApiError as e:
            await msg.edit_text(f"❌ {_primeiro_erro(e) or 'Nao foi possivel renomear.'}")
            return
        antigo = escapar_markdown(item["nome"])
        await msg.edit_text(
            f"✏️ *{antigo}* agora se chama *{escapar_markdown(atualizado['nome'])}*.",
            parse_mode="Markdown",
        )
        return

    if acao not in ("ENTRADA", "SAIDA"):
        await msg.edit_text("❌ Nao entendi se era para adicionar ou retirar.")
        return

    if item:
        try:
            atualizado = cliente.movimentar(item["id"], acao, qtd)
        except ApiError as e:
            await msg.edit_text(f"❌ {_primeiro_erro(e) or 'Nao foi possivel registrar a movimentacao.'}")
            return
        verbo = "Adicionado" if acao == "ENTRADA" else "Retirado"
        nome_md = escapar_markdown(atualizado["nome"])
        aviso = ""
        if atualizado["status"] != "ok":
            aviso = "\n⚠️ Item no nivel minimo, entrou na lista de compras."
        await msg.edit_text(
            f"✅ {verbo} {qtd}x *{nome_md}*.\nSaldo atual: {atualizado['qtd']} un.{aviso}",
            parse_mode="Markdown",
        )
        return

    # Item novo
    qtd_inicial = qtd if acao == "ENTRADA" else 0
    categoria = str(dados.get("categoria") or "Geral")
    try:
        criado = cliente.criar_item(nome, categoria, qtd_inicial, 1)
    except ApiError as e:
        await msg.edit_text(f"❌ {_primeiro_erro(e) or 'Nao foi possivel cadastrar o item.'}")
        return

    cauda = (
        f"Saldo inicial: {qtd_inicial} un."
        if acao == "ENTRADA"
        else "Como voce pediu para retirar algo que nao existia, criei com saldo 0 - "
             "ele ja entra na lista de compras. 🛒"
    )
    await msg.edit_text(
        f"✨ Novo item!\n*{escapar_markdown(criado['nome'])}* "
        f"cadastrado em _{escapar_markdown(criado['categoria'])}_.\n{cauda}",
        parse_mode="Markdown",
    )


async def avisar_nao_autorizado(update: Update) -> None:
    chat = update.effective_chat
    print(f"[bot] mensagem de chat nao autorizado: id={chat.id} tipo={chat.type} titulo={chat.title!r}")
    await update.message.reply_text(
        f"🔒 Esse chat nao esta autorizado a usar o bot.\nID deste chat: `{chat.id}`",
        parse_mode="Markdown",
    )


async def handle_voice(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    if not autorizado(update):
        await avisar_nao_autorizado(update)
        return
    msg = await update.message.reply_text("🎙️ Ouvindo o audio...")
    with tempfile.NamedTemporaryFile(suffix=".ogg", delete=False) as tmp:
        caminho = tmp.name
    try:
        arquivo = await update.message.voice.get_file()
        await arquivo.download_to_drive(caminho)
        await executar(msg, interpretar_audio(caminho))
    except Exception as e:
        print(f"[bot] erro no audio: {e}")
        await msg.edit_text("❌ Nao consegui entender o audio. Tente de novo.")
    finally:
        if os.path.exists(caminho):
            os.remove(caminho)


async def tentar_vincular(update: Update) -> bool:
    """Se a mensagem for so um codigo de 6 digitos, tenta vincular este chat
    a conta que gerou o codigo no app. Roda antes de qualquer checagem de
    autorizacao de proposito: o vinculo acontece no privado do usuario, nao
    no grupo da familia, entao nunca vai passar em `autorizado()`."""
    texto = (update.message.text or "").strip()
    if not re.fullmatch(r"\d{6}", texto):
        return False
    try:
        resultado = cliente.vincular_telegram(texto, update.effective_chat.id)
    except ApiError:
        await update.message.reply_text("❌ Codigo invalido ou expirado.")
        return True
    await update.message.reply_text(
        f"✅ Telegram vinculado a conta *{escapar_markdown(resultado['username'])}*.\n"
        "Codigos de redefinicao de senha vao chegar aqui a partir de agora.",
        parse_mode="Markdown",
    )
    return True


async def handle_text(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    if await tentar_vincular(update):
        return
    if not autorizado(update):
        await avisar_nao_autorizado(update)
        return
    msg = await update.message.reply_text("⏳ Processando...")
    try:
        await executar(msg, interpretar(update.message.text))
    except Exception as e:
        print(f"[bot] erro no texto: {e}")
        await msg.edit_text("❌ Nao consegui entender o comando.")


def main() -> None:
    if not settings.TELEGRAM_BOT_TOKEN:
        raise SystemExit("Defina TELEGRAM_BOT_TOKEN em backend/.env")
    if not settings.BOT_API_PASSWORD:
        raise SystemExit(
            "Defina BOT_API_PASSWORD em backend/.env (senha do usuario de servico do bot - "
            "crie um com 'python manage.py criar_usuario_bot')"
        )

    app = Application.builder().token(settings.TELEGRAM_BOT_TOKEN).build()
    app.add_handler(MessageHandler(filters.VOICE, handle_voice))
    app.add_handler(MessageHandler(filters.TEXT & ~filters.COMMAND, handle_text))

    if not settings.TELEGRAM_CHAT_IDS:
        print("AVISO: TELEGRAM_CHAT_IDS vazio - o bot aceitara comandos de qualquer chat.")
    print(f"Bot iniciado. API: {settings.BOT_API_BASE_URL}. Chats autorizados: {len(settings.TELEGRAM_CHAT_IDS) or 'todos'}")
    print("Aguardando mensagens... (Ctrl+C para parar)")
    app.run_polling()
