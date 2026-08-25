from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError as DjangoValidationError
from rest_framework import generics, serializers
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken

from bots.models import PasswordResetCode
from bots.notify import enviar_telegram

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


MENSAGEM_GENERICA_SOLICITACAO = "Se o usuario existir, um codigo foi enviado no Telegram da familia."


class PasswordResetRequestView(APIView):
    """Manda um codigo de 6 digitos pro chat do Telegram (mesmo grupo que ja
    recebe avisos de nivel minimo) - nao existe SMTP configurado, e todo
    mundo que usa o app ja esta nesse chat. Resposta e sempre a mesma,
    exista ou nao o usuario, pra nao revelar quais contas existem."""

    permission_classes = [AllowAny]

    def post(self, request):
        username = str(request.data.get("username") or "").strip()
        user = User.objects.filter(username__iexact=username).first() if username else None
        if user:
            codigo = PasswordResetCode.gerar(user)
            enviar_telegram(
                f"🔑 Codigo pra redefinir a senha de *{user.username}*: `{codigo.code}`\n"
                f"Vale por {int(PasswordResetCode.LIFETIME.total_seconds() // 60)} minutos. "
                "Se nao foi voce quem pediu, ignore esta mensagem."
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
