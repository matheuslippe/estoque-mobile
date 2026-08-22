from django.db import transaction
from django.db.models import F
from rest_framework.response import Response
from rest_framework.views import APIView

from estoque.models import Item
from historico.models import Movimentacao


class ListaComprasView(APIView):
    """GET /api/lista-compras/ — itens em falta (qtd <= qtd_minima), com a
    quantidade sugerida para voltar ao nivel seguro (2x o minimo)."""

    def get(self, request):
        itens = Item.objects.filter(qtd__lte=F("qtd_minima")).order_by("qtd", "categoria", "nome")
        data = [
            {
                "id": item.id,
                "nome": item.nome,
                "categoria": item.categoria,
                "qtd": item.qtd,
                "qtd_minima": item.qtd_minima,
                "qtd_a_comprar": item.qtd_a_comprar,
                "zerado": item.qtd == 0,
            }
            for item in itens
        ]
        return Response(data)


class ReposicaoLoteView(APIView):
    """POST /api/reposicao-lote/ — repoe todo item em falta ao nivel seguro
    (2x o minimo), atomico, e registra um ENTRADA por item no historico."""

    def post(self, request):
        with transaction.atomic():
            faltantes = list(Item.objects.select_for_update().filter(qtd__lte=F("qtd_minima")))
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
