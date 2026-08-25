import secrets
from datetime import timedelta

from django.conf import settings
from django.db import models
from django.utils import timezone


class _CodigoDeUsoUnico(models.Model):
    """Base pra codigos de 6 digitos com expiracao e uso unico (reset de
    senha, vinculo de Telegram). Cada subclasse tem seu proprio related_name
    via `user`."""

    LIFETIME = timedelta(minutes=15)

    code = models.CharField(max_length=6)
    created_at = models.DateTimeField(auto_now_add=True)
    used = models.BooleanField(default=False)

    class Meta:
        abstract = True

    @classmethod
    def _gerar(cls, user) -> "_CodigoDeUsoUnico":
        cls.objects.filter(user=user, used=False).update(used=True)
        code = f"{secrets.randbelow(1_000_000):06d}"
        return cls.objects.create(user=user, code=code)

    @property
    def expirado(self) -> bool:
        return timezone.now() - self.created_at > self.LIFETIME

    @classmethod
    def _validar(cls, user, code: str):
        codigo = (code or "").strip()
        if not codigo:
            return None
        obj = cls.objects.filter(user=user, code=codigo, used=False).order_by("-created_at").first()
        if not obj or obj.expirado:
            return None
        return obj


class PasswordResetCode(_CodigoDeUsoUnico):
    """Codigo de 6 digitos pra 'esqueci minha senha'. Entregue via Telegram
    (bots/notify.py) pro chat pessoal vinculado do usuario (TelegramLink) -
    o app nao tem SMTP configurado. Sem vinculo, o pedido falha explicito em
    vez de vazar o codigo no grupo compartilhado da familia."""

    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="reset_codes")

    @classmethod
    def gerar(cls, user) -> "PasswordResetCode":
        return cls._gerar(user)

    @classmethod
    def validar(cls, user, code: str) -> "PasswordResetCode | None":
        return cls._validar(user, code)


class TelegramLinkCode(_CodigoDeUsoUnico):
    """Codigo de 6 digitos que o usuario logado pede no app e manda pro bot
    no Telegram (DM) pra provar que aquele chat_id e dele. Confirmado por
    `bots/telegram_bot.py:handle_text` antes de qualquer outra coisa."""

    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="telegram_link_codes")

    @classmethod
    def gerar(cls, user) -> "TelegramLinkCode":
        return cls._gerar(user)

    @classmethod
    def validar(cls, user, code: str) -> "TelegramLinkCode | None":
        return cls._validar(user, code)


class TelegramLink(models.Model):
    """Chat_id pessoal do Telegram vinculado a uma conta - pra onde vai o
    codigo de reset de senha dessa conta (nao pro grupo da familia)."""

    user = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="telegram_link")
    chat_id = models.CharField(max_length=32)
    linked_at = models.DateTimeField(auto_now_add=True)
