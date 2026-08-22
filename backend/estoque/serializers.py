from django.db.models.functions import Lower
from rest_framework import serializers

from historico.models import Movimentacao

from .models import Item


class ItemSerializer(serializers.ModelSerializer):
    status = serializers.CharField(read_only=True)
    percentual = serializers.IntegerField(read_only=True)
    qtd_a_comprar = serializers.IntegerField(read_only=True)

    class Meta:
        model = Item
        fields = ["id", "nome", "categoria", "qtd", "qtd_minima", "status", "percentual", "qtd_a_comprar"]

    def validate_nome(self, value):
        nome = " ".join(value.strip().split()).title()
        if not nome:
            raise serializers.ValidationError("Informe o nome do item.")
        colisao = Item.objects.annotate(nome_lower=Lower("nome")).filter(nome_lower=nome.lower())
        if self.instance:
            colisao = colisao.exclude(pk=self.instance.pk)
        if colisao.exists():
            raise serializers.ValidationError(f"'{nome}' ja esta cadastrado no estoque.")
        return nome

    def validate_categoria(self, value):
        categoria = (value or "").strip().title()
        return categoria or "Geral"


class MovimentarSerializer(serializers.Serializer):
    tipo = serializers.ChoiceField(choices=[Movimentacao.ENTRADA, Movimentacao.SAIDA])
    qtd = serializers.IntegerField(min_value=1, default=1)
    obs = serializers.CharField(required=False, allow_blank=True, allow_null=True)
