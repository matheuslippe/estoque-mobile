from django.db import models

from estoque.models import Item


class Movimentacao(models.Model):
    ENTRADA = "ENTRADA"
    SAIDA = "SAIDA"
    AJUSTE = "AJUSTE"
    CADASTRO = "CADASTRO"
    EXCLUSAO = "EXCLUSAO"
    TIPO_CHOICES = [
        (ENTRADA, "Entrada"),
        (SAIDA, "Saida"),
        (AJUSTE, "Ajuste"),
        (CADASTRO, "Cadastro"),
        (EXCLUSAO, "Exclusao"),
    ]

    ORIGEM_APP = "app"
    ORIGEM_BOT = "bot"
    ORIGEM_CHOICES = [
        (ORIGEM_APP, "App"),
        (ORIGEM_BOT, "Bot"),
    ]

    # Nullable: o item pode ser excluido e o historico precisa sobreviver.
    item = models.ForeignKey(Item, null=True, blank=True, on_delete=models.SET_NULL, related_name="movimentacoes")
    # Snapshot do nome no momento do evento (sobrevive a rename/exclusao).
    item_nome = models.CharField(max_length=200)
    tipo = models.CharField(max_length=20, choices=TIPO_CHOICES)
    quantidade = models.IntegerField()
    data_hora = models.DateTimeField(auto_now_add=True)
    origem = models.CharField(max_length=10, choices=ORIGEM_CHOICES, default=ORIGEM_APP)
    obs = models.CharField(max_length=255, null=True, blank=True)

    class Meta:
        ordering = ["-data_hora"]
        indexes = [
            models.Index(fields=["data_hora"], name="idx_hist_data"),
            models.Index(fields=["item"], name="idx_hist_item"),
        ]

    def __str__(self) -> str:
        return f"{self.tipo} - {self.item_nome} ({self.quantidade})"
