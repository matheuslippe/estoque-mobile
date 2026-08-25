from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError as DjangoValidationError
from rest_framework import generics, serializers
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken

from bots.models import PasswordResetCode, TelegramLink, TelegramLinkCode
from bots.notify import enviar_telegram_dm

User = get_user_model()


class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, style={"input_type": "password"})

    class Meta:
        model = User
        fields = ["username", "email", "password"]
        extra_kwargs = {"email": {"required": False}}

    def validate_username(self, value):
        username = value.strip()
        if not username:
            raise serializers.ValidationError("Informe um nome de usuario.")
        if User.objects.filter(username__iexact=username).exists():
            raise serializers.ValidationError("Esse nome de usuario ja esta em uso.")
        return username

    def validate_password(self, value):
        try:
            validate_password(value)
        except DjangoValidationError as exc:
            raise serializers.ValidationError(list(exc.messages))
        return value

    def create(self, validated_data):
        return User.objects.create_user(
            username=validated_data["username"],
            email=validated_data.get("email", ""),
            password=validated_data["password"],
        )


class RegisterView(generics.CreateAPIView):
    serializer_class = RegisterSerializer
    permission_classes = [AllowAny]

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        refresh = RefreshToken.for_user(user)
        return Response({"access": str(refresh.access_token), "refresh": str(refresh)}, status=201)


MENSAGEM_GENERICA_SOLICITACAO = (
    "Se o usuario existir e tiver o Telegram vinculado, um codigo foi enviado no chat pessoal dele."
)


class PasswordResetRequestView(APIView):
    """Manda um codigo de 6 digitos pro chat PESSOAL do Telegram vinculado a
    conta (TelegramLink) - nunca pro grupo compartilhado da familia, pra nao
    vazar o codigo de um usuario pros outros. Resposta e sempre a mesma,
    exista ou nao o usuario (ou esteja ou nao vinculado), pra nao revelar
    quais contas existem."""

    permission_classes = [AllowAny]

    def post(self, request):
        username = str(request.data.get("username") or "").strip()
        user = User.objects.filter(username__iexact=username).first() if username else None
        link = TelegramLink.objects.filter(user=user).first() if user else None
        if user and link:
            codigo = PasswordResetCode.gerar(user)
            enviar_telegram_dm(
                link.chat_id,
                f"🔑 Codigo pra redefinir a senha de *{user.username}*: `{codigo.code}`\n"
                f"Vale por {int(PasswordResetCode.LIFETIME.total_seconds() // 60)} minutos. "
                "Se nao foi voce quem pediu, ignore esta mensagem.",
            )
        return Response({"detail": MENSAGEM_GENERICA_SOLICITACAO})


class PasswordResetConfirmSerializer(serializers.Serializer):
    username = serializers.CharField()
    code = serializers.CharField()
    new_password = serializers.CharField(write_only=True, style={"input_type": "password"})

    def validate(self, attrs):
        user = User.objects.filter(username__iexact=attrs["username"].strip()).first()
        codigo = PasswordResetCode.validar(user, attrs["code"]) if user else None
        if not codigo:
            raise serializers.ValidationError({"code": ["Codigo invalido ou expirado."]})
        try:
            validate_password(attrs["new_password"], user=user)
        except DjangoValidationError as exc:
            raise serializers.ValidationError({"new_password": list(exc.messages)})
        attrs["user"] = user
        attrs["codigo"] = codigo
        return attrs


class PasswordResetConfirmView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = PasswordResetConfirmSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.validated_data["user"]
        codigo = serializer.validated_data["codigo"]

        user.set_password(serializer.validated_data["new_password"])
        user.save(update_fields=["password"])
        codigo.used = True
        codigo.save(update_fields=["used"])

        refresh = RefreshToken.for_user(user)
        return Response({"access": str(refresh.access_token), "refresh": str(refresh)})


class TelegramLinkStatusView(APIView):
    """Diz se o usuario logado ja tem um Telegram vinculado - pra o app
    decidir se mostra 'vincular' ou 'trocar/desvincular'."""

    def get(self, request):
        vinculado = TelegramLink.objects.filter(user=request.user).exists()
        return Response({"linked": vinculado})


class TelegramLinkRequestView(APIView):
    """Gera o codigo que o usuario logado vai mandar pro bot no Telegram
    (DM) pra provar que aquele chat e dele."""

    def post(self, request):
        codigo = TelegramLinkCode.gerar(request.user)
        return Response(
            {"code": codigo.code, "expires_in_minutes": int(TelegramLinkCode.LIFETIME.total_seconds() // 60)}
        )


class TelegramLinkConfirmSerializer(serializers.Serializer):
    code = serializers.CharField()
    chat_id = serializers.CharField()


class TelegramLinkConfirmView(APIView):
    """Chamado pelo bot (com a credencial de servico dele, nao a do usuario)
    quando alguem manda um codigo de vinculo no privado. `code` identifica
    de qual usuario e o pedido; `chat_id` e o chat que vai ficar vinculado."""

    def post(self, request):
        serializer = TelegramLinkConfirmSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        code = serializer.validated_data["code"]
        chat_id = serializer.validated_data["chat_id"]

        for user in User.objects.filter(telegram_link_codes__code=code, telegram_link_codes__used=False):
            codigo = TelegramLinkCode.validar(user, code)
            if codigo:
                TelegramLink.objects.update_or_create(user=user, defaults={"chat_id": chat_id})
                codigo.used = True
                codigo.save(update_fields=["used"])
                return Response({"username": user.username})

        return Response({"detail": "Codigo invalido ou expirado."}, status=400)
