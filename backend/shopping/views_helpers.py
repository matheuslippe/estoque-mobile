from django.db.models import F

from estoque.models import Item


def itens_em_falta_queryset():
    return Item.objects.filter(qtd__lte=F("qtd_minima")).order_by("qtd", "categoria", "nome")


def serializar_lista_compras(itens) -> list[dict]:
    return [
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
