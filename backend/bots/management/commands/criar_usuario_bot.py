from django.conf import settings
from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand


class Command(BaseCommand):
    help = (
        "Cria (ou atualiza a senha d)o usuario de servico que o bot do Telegram usa "
        "pra autenticar na API via JWT. Le username/senha de BOT_API_USERNAME/"
        "BOT_API_PASSWORD no backend/.env - sem staff, sem superuser."
    )

    def handle(self, *args, **options):
        username = settings.BOT_API_USERNAME
        password = settings.BOT_API_PASSWORD
        if not password:
            self.stderr.write(self.style.ERROR("Defina BOT_API_PASSWORD em backend/.env antes de rodar isso."))
            return

        User = get_user_model()
        user, criado = User.objects.get_or_create(username=username)
        user.set_password(password)
        user.is_staff = False
        user.is_superuser = False
        user.save()

        acao = "criado" if criado else "atualizado"
        self.stdout.write(self.style.SUCCESS(f"Usuario '{username}' {acao} com a senha do .env."))
