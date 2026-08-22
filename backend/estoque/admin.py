from django.contrib import admin

from .models import Item


@admin.register(Item)
class ItemAdmin(admin.ModelAdmin):
    list_display = ("nome", "categoria", "qtd", "qtd_minima", "status")
    list_filter = ("categoria",)
    search_fields = ("nome",)
