from unittest.mock import Mock, patch

from django.test import TestCase, override_settings

from .api_client import ApiError, EstoqueApiClient
from .formatting import escapar_markdown, texto_lista_compras
from .telegram_bot import buscar_item


class TestEscaparMarkdown(TestCase):
    def test_escapa_caracteres_especiais(self):
        assert escapar_markdown("Arroz *especial* [novo]") == "Arroz \\*especial\\* \\[novo]"

    def test_string_normal_fica_igual(self):
        assert escapar_markdown("Arroz Integral") == "Arroz Integral"


class TestTextoListaCompras(TestCase):
    def test_nenhum_item_retorna_none(self):
        assert texto_lista_compras([]) is None

    def test_agrupa_por_categoria_e_marca_zerado(self):
        itens = [
            {"nome": "Feijao", "categoria": "Comida", "qtd_a_comprar": 3, "zerado": False},
            {"nome": "Sabao", "categoria": "Limpeza", "qtd_a_comprar": 2, "zerado": True},
        ]
        texto = texto_lista_compras(itens)
        assert "*Comida*" in texto
        assert "*Limpeza*" in texto
        assert "Feijao: comprar 3 un." in texto
        assert "Sabao: comprar 2 un. (ZERADO)" in texto


class TestBuscarItem(TestCase):
    ITENS = [
        {"id": 1, "nome": "Sabao Em Po"},
        {"id": 2, "nome": "Sabao Liquido"},
        {"id": 3, "nome": "Arroz Integral"},
    ]

    def test_casamento_exato(self):
        assert buscar_item(self.ITENS, "Arroz Integral")["id"] == 3

    def test_sem_correspondencia_retorna_none(self):
        assert buscar_item(self.ITENS, "Detergente") is None

    def test_ambiguo_escolhe_mais_parecido_em_tamanho(self):
        # "sabao em po" e mais proximo em tamanho de "Sabao Em Po" que de "Sabao Liquido"
        assert buscar_item(self.ITENS, "sabao em po")["id"] == 1

    def test_string_vazia_retorna_none(self):
        assert buscar_item(self.ITENS, "   ") is None


@override_settings(BOT_API_BASE_URL="http://testserver/api", BOT_API_USERNAME="bot", BOT_API_PASSWORD="senha123")
class TestEstoqueApiClient(TestCase):
    @patch("bots.api_client.requests.post")
    @patch("bots.api_client.requests.request")
    def test_faz_login_e_reusa_o_token(self, mock_request, mock_post):
        mock_post.return_value = Mock(ok=True, json=lambda: {"access": "tok123", "refresh": "ref456"})
        mock_request.return_value = Mock(ok=True, status_code=200, content=b"[]", json=lambda: [])

        cliente = EstoqueApiClient()
        cliente.listar_itens()
        cliente.lista_compras()

        assert mock_post.call_count == 1  # so logou uma vez
        assert mock_request.call_count == 2
        headers = mock_request.call_args.kwargs["headers"]
        assert headers["Authorization"] == "Bearer tok123"

    @patch("bots.api_client.requests.post")
    def test_login_invalido_levanta_apierror(self, mock_post):
        mock_post.return_value = Mock(ok=False, status_code=401, json=lambda: {"detail": "invalido"})
        cliente = EstoqueApiClient()
        with self.assertRaises(ApiError):
            cliente.listar_itens()

    @patch("bots.api_client.requests.post")
    @patch("bots.api_client.requests.request")
    def test_401_forca_novo_login_uma_vez(self, mock_request, mock_post):
        mock_post.return_value = Mock(ok=True, json=lambda: {"access": "tok1", "refresh": "r"})
        mock_request.side_effect = [
            Mock(ok=False, status_code=401, content=b"{}", json=lambda: {}),
            Mock(ok=True, status_code=200, content=b"[]", json=lambda: []),
        ]
        cliente = EstoqueApiClient()
        resultado = cliente.listar_itens()
        assert resultado == []
        assert mock_post.call_count == 2  # logou de novo apos o 401
