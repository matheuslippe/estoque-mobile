from unittest.mock import patch

import pytest

from estoque.models import Item
from historico.models import Movimentacao


@pytest.mark.django_db
class TestListaCompras:
    def test_lista_so_itens_em_falta_com_quantidade_sugerida(self, api_client):
        Item.objects.create(nome="Arroz", categoria="Comida", qtd=5, qtd_minima=2)  # ok, fora da lista
        Item.objects.create(nome="Feijao", categoria="Comida", qtd=1, qtd_minima=2)  # baixo
        Item.objects.create(nome="Sabao", categoria="Limpeza", qtd=0, qtd_minima=1)  # zerado

        resp = api_client.get("/api/lista-compras/")
        assert resp.status_code == 200
        nomes = {i["nome"] for i in resp.data}
        assert nomes == {"Feijao", "Sabao"}

        feijao = next(i for i in resp.data if i["nome"] == "Feijao")
        assert feijao["qtd_a_comprar"] == 3  # alvo 2*2=4, tem 1 -> falta 3
        assert feijao["zerado"] is False

        sabao = next(i for i in resp.data if i["nome"] == "Sabao")
        assert sabao["qtd_a_comprar"] == 2  # alvo max(2*1,1)=2, tem 0 -> falta 2
        assert sabao["zerado"] is True

    def test_nada_em_falta_retorna_lista_vazia(self, api_client):
        Item.objects.create(nome="Arroz", categoria="Comida", qtd=5, qtd_minima=2)
        resp = api_client.get("/api/lista-compras/")
        assert resp.status_code == 200
        assert resp.data == []


@pytest.mark.django_db
class TestReposicaoLote:
    def test_repoe_faltantes_ao_nivel_seguro_e_loga_entrada(self, api_client):
        Item.objects.create(nome="Feijao", categoria="Comida", qtd=1, qtd_minima=2)
        item_ok = Item.objects.create(nome="Arroz", categoria="Comida", qtd=5, qtd_minima=2)

        resp = api_client.post("/api/reposicao-lote/")
        assert resp.status_code == 200
        assert resp.data["repostos"] == 1

        feijao = Item.objects.get(nome="Feijao")
        assert feijao.qtd == 4  # 2 * qtd_minima

        item_ok.refresh_from_db()
        assert item_ok.qtd == 5  # inalterado

        mov = Movimentacao.objects.get(item=feijao, tipo=Movimentacao.ENTRADA)
        assert mov.obs == "Reposicao em lote"
        assert mov.quantidade == 3

    def test_nada_a_repor_nao_gera_historico(self, api_client):
        Item.objects.create(nome="Arroz", categoria="Comida", qtd=5, qtd_minima=2)
        resp = api_client.post("/api/reposicao-lote/")
        assert resp.status_code == 200
        assert resp.data["repostos"] == 0
        assert not Movimentacao.objects.exists()


@pytest.mark.django_db
class TestNotificarListaCompras:
    def test_envia_texto_formatado_quando_ha_itens_em_falta(self, api_client):
        Item.objects.create(nome="Feijao", categoria="Comida", qtd=1, qtd_minima=2)
        with patch("shopping.views.enviar_telegram") as enviar:
            resp = api_client.post("/api/lista-compras/notificar/")
        assert resp.status_code == 200
        assert resp.data["enviado"] is True
        enviar.assert_called_once()
        assert "Feijao" in enviar.call_args[0][0]

    def test_nao_envia_quando_nada_em_falta(self, api_client):
        Item.objects.create(nome="Arroz", categoria="Comida", qtd=5, qtd_minima=2)
        with patch("shopping.views.enviar_telegram") as enviar:
            resp = api_client.post("/api/lista-compras/notificar/")
        assert resp.status_code == 200
        assert resp.data["enviado"] is False
        enviar.assert_not_called()
