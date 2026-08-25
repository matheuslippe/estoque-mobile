from datetime import timedelta
from unittest.mock import patch

import pytest
from django.contrib.auth import get_user_model
from django.utils import timezone
from rest_framework.test import APIClient

from bots.models import PasswordResetCode, TelegramLink, TelegramLinkCode

User = get_user_model()


@pytest.mark.django_db
class TestRegister:
    def test_cria_usuario_e_retorna_tokens(self):
        resp = APIClient().post(
            "/api/register/", {"username": "nova_matheus", "password": "senha-bem-forte-123"}
        )
        assert resp.status_code == 201
        assert "access" in resp.data
        assert "refresh" in resp.data
        assert User.objects.filter(username="nova_matheus").exists()

    def test_nao_precisa_estar_autenticado(self):
        resp = APIClient().post("/api/register/", {"username": "sem_login", "password": "senha-bem-forte-123"})
        assert resp.status_code == 201

    def test_rejeita_username_duplicado_case_insensitive(self):
        User.objects.create_user(username="Marina", password="outra-senha-forte-1")
        resp = APIClient().post("/api/register/", {"username": "marina", "password": "senha-bem-forte-123"})
        assert resp.status_code == 400
        assert "username" in resp.data

    def test_rejeita_senha_fraca(self):
        resp = APIClient().post("/api/register/", {"username": "usuario_novo", "password": "123"})
        assert resp.status_code == 400
        assert "password" in resp.data


@pytest.mark.django_db
class TestPasswordResetRequest:
    @patch("core.auth_views.enviar_telegram_dm")
    def test_usuario_com_telegram_vinculado_recebe_codigo_no_dm(self, mock_enviar):
        user = User.objects.create_user(username="marina", password="senha-atual-123")
        TelegramLink.objects.create(user=user, chat_id="555444333")

        resp = APIClient().post("/api/password-reset/request/", {"username": "marina"})
        assert resp.status_code == 200
        assert mock_enviar.call_count == 1
        assert mock_enviar.call_args[0][0] == "555444333"
        codigo = PasswordResetCode.objects.get(user=user)
        assert codigo.code in mock_enviar.call_args[0][1]

    @patch("core.auth_views.enviar_telegram_dm")
    def test_usuario_sem_telegram_vinculado_nao_recebe_nada_mas_resposta_e_igual(self, mock_enviar):
        User.objects.create_user(username="sem_vinculo", password="senha-atual-123")
        resp = APIClient().post("/api/password-reset/request/", {"username": "sem_vinculo"})
        assert resp.status_code == 200
        mock_enviar.assert_not_called()

    @patch("core.auth_views.enviar_telegram_dm")
    def test_usuario_inexistente_nao_envia_nada_mas_resposta_e_igual(self, mock_enviar):
        user = User.objects.create_user(username="marina", password="senha-atual-123")
        TelegramLink.objects.create(user=user, chat_id="555444333")

        resp_existe = APIClient().post("/api/password-reset/request/", {"username": "ninguem"})
        resp_generica = APIClient().post("/api/password-reset/request/", {"username": "ninguem"})
        assert resp_existe.status_code == resp_generica.status_code == 200
        assert resp_existe.data == resp_generica.data
        mock_enviar.assert_not_called()


@pytest.mark.django_db
class TestPasswordResetConfirm:
    def _pedir_codigo(self, user):
        TelegramLink.objects.get_or_create(user=user, defaults={"chat_id": "111222333"})
        with patch("core.auth_views.enviar_telegram_dm"):
            APIClient().post("/api/password-reset/request/", {"username": user.username})
        return PasswordResetCode.objects.filter(user=user, used=False).latest("created_at")

    def test_codigo_valido_redefine_senha_e_retorna_tokens(self):
        user = User.objects.create_user(username="marina", password="senha-antiga-123")
        codigo = self._pedir_codigo(user)

        resp = APIClient().post(
            "/api/password-reset/confirm/",
            {"username": "marina", "code": codigo.code, "new_password": "senha-nova-e-forte-456"},
        )
        assert resp.status_code == 200
        assert "access" in resp.data and "refresh" in resp.data

        user.refresh_from_db()
        assert user.check_password("senha-nova-e-forte-456")
        codigo.refresh_from_db()
        assert codigo.used is True

    def test_codigo_errado_e_rejeitado(self):
        user = User.objects.create_user(username="marina", password="senha-antiga-123")
        self._pedir_codigo(user)
        resp = APIClient().post(
            "/api/password-reset/confirm/",
            {"username": "marina", "code": "000000", "new_password": "senha-nova-e-forte-456"},
        )
        assert resp.status_code == 400

    def test_codigo_expirado_e_rejeitado(self):
        user = User.objects.create_user(username="marina", password="senha-antiga-123")
        codigo = self._pedir_codigo(user)
        PasswordResetCode.objects.filter(pk=codigo.pk).update(
            created_at=timezone.now() - PasswordResetCode.LIFETIME - timedelta(minutes=1)
        )
        resp = APIClient().post(
            "/api/password-reset/confirm/",
            {"username": "marina", "code": codigo.code, "new_password": "senha-nova-e-forte-456"},
        )
        assert resp.status_code == 400

    def test_codigo_ja_usado_nao_pode_ser_reaproveitado(self):
        user = User.objects.create_user(username="marina", password="senha-antiga-123")
        codigo = self._pedir_codigo(user)
        payload = {"username": "marina", "code": codigo.code, "new_password": "senha-nova-e-forte-456"}
        assert APIClient().post("/api/password-reset/confirm/", payload).status_code == 200
        resp = APIClient().post(
            "/api/password-reset/confirm/",
            {**payload, "new_password": "outra-senha-bem-forte-789"},
        )
        assert resp.status_code == 400

    def test_senha_fraca_e_rejeitada(self):
        user = User.objects.create_user(username="marina", password="senha-antiga-123")
        codigo = self._pedir_codigo(user)
        resp = APIClient().post(
            "/api/password-reset/confirm/",
            {"username": "marina", "code": codigo.code, "new_password": "123"},
        )
        assert resp.status_code == 400


def _api_client_autenticado(user):
    client = APIClient()
    client.force_authenticate(user=user)
    return client


@pytest.mark.django_db
class TestTelegramLinkStatus:
    def test_sem_vinculo_retorna_false(self):
        user = User.objects.create_user(username="marina", password="senha-123456")
        resp = _api_client_autenticado(user).get("/api/telegram/link/status/")
        assert resp.status_code == 200
        assert resp.data["linked"] is False

    def test_com_vinculo_retorna_true(self):
        user = User.objects.create_user(username="marina", password="senha-123456")
        TelegramLink.objects.create(user=user, chat_id="123")
        resp = _api_client_autenticado(user).get("/api/telegram/link/status/")
        assert resp.data["linked"] is True

    def test_exige_autenticacao(self):
        resp = APIClient().get("/api/telegram/link/status/")
        assert resp.status_code == 401


@pytest.mark.django_db
class TestTelegramLinkRequest:
    def test_gera_codigo_pro_usuario_logado(self):
        user = User.objects.create_user(username="marina", password="senha-123456")
        resp = _api_client_autenticado(user).post("/api/telegram/link/request/")
        assert resp.status_code == 200
        assert len(resp.data["code"]) == 6
        assert TelegramLinkCode.objects.filter(user=user, code=resp.data["code"], used=False).exists()

    def test_exige_autenticacao(self):
        resp = APIClient().post("/api/telegram/link/request/")
        assert resp.status_code == 401


@pytest.mark.django_db
class TestTelegramLinkConfirm:
    def test_codigo_valido_vincula_chat_id(self):
        user = User.objects.create_user(username="marina", password="senha-123456")
        bot = User.objects.create_user(username="bot", password="senha-do-bot-123")
        codigo = TelegramLinkCode.gerar(user)

        resp = _api_client_autenticado(bot).post(
            "/api/telegram/link/confirm/", {"code": codigo.code, "chat_id": "987654321"}
        )
        assert resp.status_code == 200
        assert resp.data["username"] == "marina"

        link = TelegramLink.objects.get(user=user)
        assert link.chat_id == "987654321"
        codigo.refresh_from_db()
        assert codigo.used is True

    def test_codigo_invalido_e_rejeitado(self):
        bot = User.objects.create_user(username="bot", password="senha-do-bot-123")
        resp = _api_client_autenticado(bot).post(
            "/api/telegram/link/confirm/", {"code": "000000", "chat_id": "987654321"}
        )
        assert resp.status_code == 400
        assert not TelegramLink.objects.exists()

    def test_revincular_atualiza_chat_id_existente(self):
        user = User.objects.create_user(username="marina", password="senha-123456")
        bot = User.objects.create_user(username="bot", password="senha-do-bot-123")
        TelegramLink.objects.create(user=user, chat_id="chat-antigo")

        codigo = TelegramLinkCode.gerar(user)
        resp = _api_client_autenticado(bot).post(
            "/api/telegram/link/confirm/", {"code": codigo.code, "chat_id": "chat-novo"}
        )
        assert resp.status_code == 200
        assert TelegramLink.objects.get(user=user).chat_id == "chat-novo"
        assert TelegramLink.objects.filter(user=user).count() == 1

    def test_exige_autenticacao(self):
        resp = APIClient().post("/api/telegram/link/confirm/", {"code": "123456", "chat_id": "1"})
        assert resp.status_code == 401
