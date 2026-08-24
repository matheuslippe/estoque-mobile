from django.core.management.base import BaseCommand

from bots.telegram_bot import main


class Command(BaseCommand):
    help = "Inicia o bot do Telegram (polling). Ctrl+C para parar."

    def handle(self, *args, **options):
        main()
