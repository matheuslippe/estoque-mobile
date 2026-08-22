from django.db import models
from django.db.models.functions import Lower


class Item(models.Model):
    nome = models.CharField(max_length=200)
    categoria = models.CharField(max_length=100, default="Geral")
    qtd = models.PositiveIntegerField(default=0)
    qtd_minima = models.PositiveIntegerField(default=1)

    class Meta:
        ordering = ["categoria", "nome"]
        constraints = [
            models.UniqueConstraint(Lower("nome"), name="item_nome_unico"),
        ]

    def __str__(self) -> str:
        return self.nome

    @property
    def alvo_reposicao(self) -> int:
        return max(self.qtd_minima * 2, 1)

    @property
    def status(self) -> str:
        if self.qtd == 0:
            return "zerado"
        if self.qtd <= self.qtd_minima:
            return "baixo"
        return "ok"

    @property
    def percentual(self) -> int:
        return min(100, round(self.qtd / self.alvo_reposicao * 100))

    @property
    def qtd_a_comprar(self) -> int:
        return max(1, self.alvo_reposicao - self.qtd)
