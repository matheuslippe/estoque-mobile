"""Cliente HTTP fino pra API Django - e assim que o bot le/escreve no
estoque agora, em vez de importar os models direto. Mantem uma unica
implementacao das regras de negocio (a API), como app e bot faziam via
`db.py` compartilhado no projeto original."""

from __future__ import annotations

import requests
from django.conf import settings


class ApiError(Exception):
    def __init__(self, message: str, status_code: int | None = None, payload: dict | None = None):
        super().__init__(message)
        self.status_code = status_code
        self.payload = payload or {}


def _safe_json(resp: requests.Response) -> dict:
    try:
        return resp.json()
    except ValueError:
        return {}


class EstoqueApiClient:
    def __init__(self, base_url: str | None = None, username: str | None = None, password: str | None = None):
        self.base_url = (base_url or settings.BOT_API_BASE_URL).rstrip("/")
        self.username = username or settings.BOT_API_USERNAME
        self.password = password or settings.BOT_API_PASSWORD
        self._access: str | None = None

    def _login(self) -> None:
        resp = requests.post(
            f"{self.base_url}/token/",
            json={"username": self.username, "password": self.password},
            timeout=10,
        )
        if not resp.ok:
            raise ApiError("Falha ao autenticar o bot na API.", resp.status_code, _safe_json(resp))
        self._access = resp.json()["access"]

    def _request(self, method: str, path: str, retry: bool = True, **kwargs) -> dict | list | None:
        if not self._access:
            self._login()
        resp = requests.request(
            method,
            f"{self.base_url}{path}",
            headers={"Authorization": f"Bearer {self._access}"},
            timeout=15,
            **kwargs,
        )
        if resp.status_code == 401 and retry:
            self._access = None
            return self._request(method, path, retry=False, **kwargs)
        if not resp.ok:
            raise ApiError(f"{method} {path} -> {resp.status_code}", resp.status_code, _safe_json(resp))
        return resp.json() if resp.content else None

    # -- leitura --------------------------------------------------
    def listar_itens(self) -> list[dict]:
        return self._request("GET", "/itens/")

    def lista_compras(self) -> list[dict]:
        return self._request("GET", "/lista-compras/")

    # -- escrita --------------------------------------------------
    def criar_item(self, nome: str, categoria: str, qtd: int, qtd_minima: int = 1) -> dict:
        return self._request(
            "POST",
            "/itens/",
            json={"nome": nome, "categoria": categoria, "qtd": qtd, "qtd_minima": qtd_minima},
        )

    def movimentar(self, item_id: int, tipo: str, qtd: int, obs: str | None = None) -> dict:
        return self._request("POST", f"/itens/{item_id}/movimentar/", json={"tipo": tipo, "qtd": qtd, "obs": obs})

    def renomear_item(self, item_id: int, novo_nome: str) -> dict:
        return self._request("PATCH", f"/itens/{item_id}/", json={"nome": novo_nome})
