import secrets
from datetime import timedelta

from django.conf import settings
from django.db import models
from django.utils import timezone


class PasswordResetCode(models.Model):
    """Codigo de 6 digitos pra 'esqueci minha senha', entregue via Telegram
    (bots/notify.py) em vez de e-mail - o app nao tem SMTP configurado, mas
    ja tem o bot falando com o chat da familia."""

    LIFETIME = timedelta(minutes=15)

    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="reset_codes")
    code = models.CharField(max_length=6)
    created_at = models.DateTimeField(auto_now_add=True)
    used = models.BooleanField(default=False)

    @classmethod
    def gerar(cls, user) -> "PasswordResetCode":
        cls.objects.filter(user=user, used=False).update(used=True)
        code = f"{secrets.randbelow(1_000_000):06d}"
        return cls.objects.create(user=user, code=code)

    @property
    def expirado(self) -> bool:
        return timezone.now() - self.created_at > self.LIFETIME

    @classmethod
    def validar(cls, user, code: str) -> "PasswordResetCode | None":
        codigo = (code or "").strip()
        if not codigo:
            return None
        obj = cls.objects.filter(user=user, code=codigo, used=False).order_by("-created_at").first()
        if not obj or obj.expirado:
            return None
        return obj
