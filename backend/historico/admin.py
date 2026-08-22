from django.contrib import admin

from .models import Movimentacao


@admin.register(Movimentacao)
class MovimentacaoAdmin(admin.ModelAdmin):
    list_display = ("item_nome", "tipo", "quantidade", "origem", "data_hora")
    list_filter = ("tipo", "origem")
    search_fields = ("item_nome", "obs")
    readonly_fields = ("data_hora",)
