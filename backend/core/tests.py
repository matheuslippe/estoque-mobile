from datetime import timedelta
from unittest.mock import patch

import pytest
from django.contrib.auth import get_user_model
from django.utils import timezone
from rest_framework.test import APIClient

from bots.models import PasswordResetCode

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
    @patch("core.auth_views.enviar_telegram")
    def test_usuario_existente_recebe_codigo_por_telegram(self, mock_enviar):
        user = User.objects.create_user(username="marina", password="senha-atual-123")
        resp = APIClient().post("/api/password-reset/request/", {"username": "marina"})
        assert resp.status_code == 200
        assert mock_enviar.call_count == 1
        codigo = PasswordResetCode.objects.get(user=user)
        assert codigo.code in mock_enviar.call_args[0][0]

    @patch("core.auth_views.enviar_telegram")
    def test_usuario_inexistente_nao_envia_nada_mas_resposta_e_igual(self, mock_enviar):
        resp_existe = APIClient().post("/api/password-reset/request/", {"username": "ninguem"})
        User.objects.create_user(username="existe", password="senha-atual-123")
        resp_generica = APIClient().post("/api/password-reset/request/", {"username": "ninguem"})
        assert resp_existe.status_code == resp_generica.status_code == 200
        assert resp_existe.data == resp_generica.data
        mock_enviar.assert_not_called()


@pytest.mark.django_db
class TestPasswordResetConfirm:
    def _pedir_codigo(self, user):
        with patch("core.auth_views.enviar_telegram"):
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
