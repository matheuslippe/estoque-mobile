from django.contrib import admin
from django.http import JsonResponse
from django.urls import include, path
from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView
from rest_framework.permissions import AllowAny
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView

from estoque.views import ItemViewSet
from historico.views import MovimentacaoViewSet
from shopping.views import ListaComprasView, NotificarListaComprasView, ReposicaoLoteView

from .auth_views import PasswordResetConfirmView, PasswordResetRequestView, RegisterView

router = DefaultRouter()
router.register("itens", ItemViewSet, basename="item")
router.register("movimentacoes", MovimentacaoViewSet, basename="movimentacao")


class OpenSpectacularAPIView(SpectacularAPIView):
    permission_classes = [AllowAny]


class OpenSpectacularSwaggerView(SpectacularSwaggerView):
    permission_classes = [AllowAny]


urlpatterns = [
    path("health/", lambda request: JsonResponse({"status": "ok"}), name="health"),
    path("admin/", admin.site.urls),
    path("api/", include(router.urls)),
    path("api/lista-compras/", ListaComprasView.as_view(), name="lista-compras"),
    path("api/lista-compras/notificar/", NotificarListaComprasView.as_view(), name="lista-compras-notificar"),
    path("api/reposicao-lote/", ReposicaoLoteView.as_view(), name="reposicao-lote"),
    path("api/register/", RegisterView.as_view(), name="register"),
    path("api/password-reset/request/", PasswordResetRequestView.as_view(), name="password-reset-request"),
    path("api/password-reset/confirm/", PasswordResetConfirmView.as_view(), name="password-reset-confirm"),
    path("api/token/", TokenObtainPairView.as_view(), name="token_obtain_pair"),
    path("api/token/refresh/", TokenRefreshView.as_view(), name="token_refresh"),
    path("api/schema/", OpenSpectacularAPIView.as_view(), name="schema"),
    path("api/docs/", OpenSpectacularSwaggerView.as_view(url_name="schema"), name="swagger-ui"),
]
