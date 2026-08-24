"""Formatacao de texto pro Telegram (Markdown), compartilhada entre o bot
interativo e os avisos automaticos de nivel minimo."""

from __future__ import annotations


def escapar_markdown(texto: str) -> str:
    """Neutraliza caracteres que quebram o parse_mode=Markdown do Telegram.

    Um item chamado "Arroz *especial*" fazia a API responder 400 e a
    mensagem era descartada em silencio.
    """
    for ch in ("_", "*", "`", "["):
        texto = texto.replace(ch, f"\\{ch}")
    return texto


def texto_lista_compras(itens_em_falta: list[dict]) -> str | None:
    """Espera a forma de `/api/lista-compras/` (nome, categoria, qtd_a_comprar,
    zerado). Retorna None quando nao ha nada a comprar."""
    if not itens_em_falta:
        return None

    linhas = ["*Lista de Compras*", ""]
    categorias: dict[str, list[dict]] = {}
    for r in itens_em_falta:
        categorias.setdefault(r["categoria"], []).append(r)

    for categoria, itens in categorias.items():
        linhas.append(f"*{escapar_markdown(categoria)}*")
        for item in itens:
            nome = escapar_markdown(item["nome"])
            alerta = " (ZERADO)" if item.get("zerado") else ""
            linhas.append(f"- {nome}: comprar {item['qtd_a_comprar']} un.{alerta}")
        linhas.append("")

    return "\n".join(linhas)
