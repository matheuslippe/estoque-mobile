from datetime import timedelta

from django.db import transaction
from django.utils import timezone
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from historico.models import Movimentacao

from .models import Item
from .serializers import ItemSerializer, MovimentarSerializer


class ItemViewSet(viewsets.ModelViewSet):
    """CRUD de itens + acoes de negocio (movimentar, analise).

    create/update/destroy sao sobrescritos (em vez do ModelViewSet padrao)
    para manter o historico sincronizado com toda alteracao no estoque,
    exatamente como o db.py original fazia.
    """

    queryset = Item.objects.all()
    serializer_class = ItemSerializer

    def get_queryset(self):
        qs = super().get_queryset()
        categoria = self.request.query_params.get("categoria")
        busca = self.request.query_params.get("busca")
        if categoria and categoria != "Todos":
            qs = qs.filter(categoria=categoria)
        if busca and busca.strip():
            qs = qs.filter(nome__icontains=busca.strip())
        return qs

    def perform_create(self, serializer):
        item = serializer.save()
        Movimentacao.objects.create(
            item=item,
            item_nome=item.nome,
            tipo=Movimentacao.CADASTRO,
            quantidade=item.qtd,
            origem=Movimentacao.ORIGEM_APP,
        )

    def perform_update(self, serializer):
        nome_antigo = serializer.instance.nome
        qtd_antiga = serializer.instance.qtd
        item = serializer.save()

        obs = None
        if item.nome.lower() != nome_antigo.lower():
            obs = f"Renomeado de {nome_antigo}"

        Movimentacao.objects.create(
            item=item,
            item_nome=item.nome,
            tipo=Movimentacao.AJUSTE,
            quantidade=item.qtd - qtd_antiga,
            origem=Movimentacao.ORIGEM_APP,
            obs=obs,
        )

    def perform_destroy(self, instance):
        Movimentacao.objects.create(
            item=None,
            item_nome=instance.nome,
            tipo=Movimentacao.EXCLUSAO,
            quantidade=0,
            origem=Movimentacao.ORIGEM_APP,
        )
        instance.delete()

    @action(detail=True, methods=["post"])
    def movimentar(self, request, pk=None):
        """Aplica ENTRADA/SAIDA de forma atomica (mesma regra do db.py: a
        quantidade nova e calculada dentro da transacao, com lock de linha,
        para nao perder escrita concorrente do app com o bot)."""
        serializer = MovimentarSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        tipo = serializer.validated_data["tipo"]
        qtd = serializer.validated_data["qtd"]
        obs = serializer.validated_data.get("obs") or None

        with transaction.atomic():
            item = Item.objects.select_for_update().get(pk=self.get_object().pk)
            if tipo == Movimentacao.ENTRADA:
                nova = item.qtd + qtd
            else:
                nova = max(0, item.qtd - qtd)
                if nova == item.qtd:
                    return Response(
                        {"detail": f"'{item.nome}' ja esta zerado."},
                        status=status.HTTP_400_BAD_REQUEST,
                    )

            aplicada = abs(nova - item.qtd)
            item.qtd = nova
            item.save(update_fields=["qtd"])
            Movimentacao.objects.create(
                item=item,
                item_nome=item.nome,
                tipo=tipo,
                quantidade=aplicada,
                origem=Movimentacao.ORIGEM_APP,
                obs=obs,
            )

        return Response(ItemSerializer(item).data)

    @action(detail=True, methods=["get"])
    def analise(self, request, pk=None):
        """Reproduz `calcular_analise` do Streamlit para um item: consumo
        no periodo, consumo/dia, dias restantes e serie diaria de saidas."""
        item = self.get_object()
        dias = int(request.query_params.get("dias", 30))
        desde = timezone.now() - timedelta(days=dias)
        saidas = list(
            Movimentacao.objects.filter(
                item=item, tipo=Movimentacao.SAIDA, data_hora__gte=desde
            ).order_by("data_hora")
        )

        if not saidas:
            return Response(
                {
                    "item": item.nome,
                    "categoria": item.categoria,
                    "qtd": item.qtd,
                    "consumo_total": 0,
                    "consumo_diario": 0.0,
                    "dias_restantes": None,
                    "dias_obs": 0,
                    "por_dia": [],
                }
            )

        dias_obs = max(1, (saidas[-1].data_hora.date() - saidas[0].data_hora.date()).days + 1)
        consumo_total = sum(m.quantidade for m in saidas)
        consumo_diario = consumo_total / dias_obs
        dias_restantes = round(item.qtd / consumo_diario, 1) if consumo_diario > 0 else None

        por_dia: dict[str, int] = {}
        for m in saidas:
            dia = m.data_hora.date().isoformat()
            por_dia[dia] = por_dia.get(dia, 0) + m.quantidade

        return Response(
            {
                "item": item.nome,
                "categoria": item.categoria,
                "qtd": item.qtd,
                "consumo_total": consumo_total,
                "consumo_diario": round(consumo_diario, 3),
                "dias_restantes": dias_restantes,
                "dias_obs": dias_obs,
                "por_dia": [{"data": d, "retiradas": q} for d, q in sorted(por_dia.items())],
            }
        )
