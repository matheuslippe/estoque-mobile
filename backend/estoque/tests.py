from datetime import timedelta

import pytest
from django.utils import timezone

from historico.models import Movimentacao

from .models import Item


@pytest.mark.django_db
class TestCriarItem:
    def test_normaliza_nome_e_categoria(self, api_client):
        resp = api_client.post(
            "/api/itens/", {"nome": "  arroz   integral  ", "categoria": "comida", "qtd": 3, "qtd_minima": 2}
        )
        assert resp.status_code == 201
        assert resp.data["nome"] == "Arroz Integral"
        assert resp.data["categoria"] == "Comida"

    def test_categoria_vazia_vira_geral(self, api_client):
        resp = api_client.post("/api/itens/", {"nome": "Item X", "categoria": "", "qtd": 1, "qtd_minima": 1})
        assert resp.status_code == 201
        assert resp.data["categoria"] == "Geral"

    def test_rejeita_nome_duplicado_case_insensitive(self, api_client):
        Item.objects.create(nome="Detergente", categoria="Limpeza", qtd=3, qtd_minima=2)
        resp = api_client.post("/api/itens/", {"nome": "detergente", "categoria": "Limpeza", "qtd": 1, "qtd_minima": 1})
        assert resp.status_code == 400

    def test_cadastro_gera_historico(self, api_client):
        resp = api_client.post("/api/itens/", {"nome": "Sabao", "categoria": "Limpeza", "qtd": 3, "qtd_minima": 2})
        item_id = resp.data["id"]
        mov = Movimentacao.objects.get(item_id=item_id)
        assert mov.tipo == Movimentacao.CADASTRO
        assert mov.quantidade == 3


@pytest.mark.django_db
class TestMovimentar:
    def test_entrada_soma_quantidade(self, api_client):
        item = Item.objects.create(nome="Leite", categoria="Comida", qtd=2, qtd_minima=2)
        resp = api_client.post(f"/api/itens/{item.id}/movimentar/", {"tipo": "ENTRADA", "qtd": 5})
        assert resp.status_code == 200
        assert resp.data["qtd"] == 7

    def test_saida_nunca_fica_negativa(self, api_client):
        item = Item.objects.create(nome="Leite", categoria="Comida", qtd=2, qtd_minima=2)
        resp = api_client.post(f"/api/itens/{item.id}/movimentar/", {"tipo": "SAIDA", "qtd": 10})
        assert resp.status_code == 200
        assert resp.data["qtd"] == 0

    def test_saida_em_item_zerado_retorna_erro_sem_gravar_historico(self, api_client):
        item = Item.objects.create(nome="Leite", categoria="Comida", qtd=0, qtd_minima=2)
        resp = api_client.post(f"/api/itens/{item.id}/movimentar/", {"tipo": "SAIDA", "qtd": 1})
        assert resp.status_code == 400
        assert not Movimentacao.objects.filter(item=item).exists()


@pytest.mark.django_db
class TestAjustar:
    def test_renomear_grava_ajuste_com_nota(self, api_client):
        item = Item.objects.create(nome="Arroz", categoria="Comida", qtd=3, qtd_minima=2)
        resp = api_client.patch(f"/api/itens/{item.id}/", {"nome": "Arroz Integral"})
        assert resp.status_code == 200
        mov = Movimentacao.objects.get(item=item, tipo=Movimentacao.AJUSTE)
        assert mov.obs == "Renomeado de Arroz"

    def test_renomear_para_nome_existente_e_bloqueado(self, api_client):
        Item.objects.create(nome="Feijao", categoria="Comida", qtd=1, qtd_minima=1)
        item = Item.objects.create(nome="Arroz", categoria="Comida", qtd=3, qtd_minima=2)
        resp = api_client.patch(f"/api/itens/{item.id}/", {"nome": "feijao"})
        assert resp.status_code == 400


@pytest.mark.django_db
class TestExcluirItem:
    def test_exclusao_mantem_historico(self, api_client):
        item = Item.objects.create(nome="Cafe", categoria="Comida", qtd=1, qtd_minima=1)
        item_id = item.id
        resp = api_client.delete(f"/api/itens/{item_id}/")
        assert resp.status_code == 204
        mov = Movimentacao.objects.get(item_nome="Cafe", tipo=Movimentacao.EXCLUSAO)
        assert mov.item_id is None


@pytest.mark.django_db
class TestAnalise:
    def test_dias_restantes_calculado_pelo_periodo_observado(self, api_client):
        item = Item.objects.create(nome="Papel Higienico", categoria="Limpeza", qtd=10, qtd_minima=2)
        agora = timezone.now()
        for dias_atras in (4, 2, 0):
            Movimentacao.objects.create(
                item=item,
                item_nome=item.nome,
                tipo=Movimentacao.SAIDA,
                quantidade=2,
                origem=Movimentacao.ORIGEM_APP,
            )
        # forca as datas manualmente (auto_now_add ignora o valor passado no create)
        movs = list(Movimentacao.objects.filter(item=item).order_by("id"))
        for mov, dias_atras in zip(movs, (4, 2, 0)):
            Movimentacao.objects.filter(pk=mov.pk).update(data_hora=agora - timedelta(days=dias_atras))

        resp = api_client.get(f"/api/itens/{item.id}/analise/?dias=30")
        assert resp.status_code == 200
        # 6 unidades em 5 dias observados (4 -> 0) = 1.2/dia; 10 / 1.2 = 8.3
        assert resp.data["dias_obs"] == 5
        assert resp.data["consumo_total"] == 6
        assert resp.data["dias_restantes"] == pytest.approx(8.3, abs=0.05)

    def test_sem_saidas_no_periodo_retorna_dias_restantes_nulo(self, api_client):
        item = Item.objects.create(nome="Sal", categoria="Comida", qtd=5, qtd_minima=1)
        resp = api_client.get(f"/api/itens/{item.id}/analise/")
        assert resp.status_code == 200
        assert resp.data["dias_restantes"] is None
