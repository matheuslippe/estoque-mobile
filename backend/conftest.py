import pytest
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient


@pytest.fixture
def api_client(db):
    user = get_user_model().objects.create_user(username="tester", password="teste12345")
    client = APIClient()
    client.force_authenticate(user=user)
    return client
