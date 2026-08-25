import pytest
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient

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
