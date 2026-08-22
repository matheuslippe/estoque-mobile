from rest_framework import viewsets

from .models import Movimentacao
from .serializers import MovimentacaoSerializer


class MovimentacaoViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Movimentacao.objects.select_related("item").all()
    serializer_class = MovimentacaoSerializer

    def get_queryset(self):
        qs = super().get_queryset()
        item_id = self.request.query_params.get("item")
        data_inicio = self.request.query_params.get("data_inicio")
        data_fim = self.request.query_params.get("data_fim")
        if item_id:
            qs = qs.filter(item_id=item_id)
        if data_inicio:
            qs = qs.filter(data_hora__date__gte=data_inicio)
        if data_fim:
            qs = qs.filter(data_hora__date__lte=data_fim)
        return qs
