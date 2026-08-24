from django.db import transaction
from rest_framework.response import Response
from rest_framework.views import APIView

from bots.formatting import texto_lista_compras
from bots.notify import enviar_telegram
from estoque.models import Item
from historico.models import Movimentacao

from .views_helpers import itens_em_falta_queryset, serializar_lista_compras


class ListaComprasView(APIView):
    """GET /api/lista-compras/ — itens em falta (qtd <= qtd_minima), com a
    quantidade sugerida para voltar ao nivel seguro (2x o minimo)."""

    def get(self, request):
        return Response(serializar_lista_compras(itens_em_falta_queryset()))


class NotificarListaComprasView(APIView):
    """POST /api/lista-compras/notificar/ — dispara a lista de compras atual
    pro Telegram sob demanda (gatilho manual do app, ou de um job agendado)."""

    def post(self, request):
        itens = serializar_lista_compras(itens_em_falta_queryset())
        texto = texto_lista_compras(itens)
        if not texto:
            return Response({"detail": "Nada a comprar, nao enviei nada.", "enviado": False})

        enviar_telegram(texto)
        return Response({"detail": "Lista de compras enviada pro Telegram.", "enviado": True})


class ReposicaoLoteView(APIView):
    """POST /api/reposicao-lote/ — repoe todo item em falta ao nivel seguro
    (2x o minimo), atomico, e registra um ENTRADA por item no historico."""

    def post(self, request):
        with transaction.atomic():
            faltantes = list(Item.objects.select_for_update().filter(pk__in=itens_em_falta_queryset()))
            if not faltantes:
                return Response({"detail": "Nenhum item precisa de reposicao.", "repostos": 0})

            repostos = 0
            for item in faltantes:
                nova = item.alvo_reposicao
                if nova <= item.qtd:
                    continue
                aplicada = nova - item.qtd
                item.qtd = nova
                item.save(update_fields=["qtd"])
                Movimentacao.objects.create(
                    item=item,
                    item_nome=item.nome,
                    tipo=Movimentacao.ENTRADA,
                    quantidade=aplicada,
                    origem=Movimentacao.ORIGEM_APP,
                    obs="Reposicao em lote",
                )
                repostos += 1

        return Response({"detail": f"{repostos} item(ns) repostos ao nivel seguro.", "repostos": repostos})
