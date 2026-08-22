from rest_framework import serializers

from .models import Movimentacao


class MovimentacaoSerializer(serializers.ModelSerializer):
    class Meta:
        model = Movimentacao
        fields = ["id", "item", "item_nome", "tipo", "quantidade", "data_hora", "origem", "obs"]
        read_only_fields = fields
