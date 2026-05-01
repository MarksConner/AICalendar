from types import SimpleNamespace
from uuid import uuid4

import jwt

import app.api.users as users_api
from app.api.base_model_classes import RefreshRequest
from app.security.jwt import create_refresh_token
from app.services.user_service import ALGORITHM, SECRET_KEY


def test_refresh_returns_login_compatible_access_token(monkeypatch):
    user_id = uuid4()
    email = "refresh-test@example.com"

    monkeypatch.setattr(
        users_api,
        "get_user_by_user_id",
        lambda db, looked_up_user_id: SimpleNamespace(user_id=looked_up_user_id, email=email),
    )

    result = users_api.refresh_route(
        RefreshRequest(refresh_token=create_refresh_token(str(user_id))),
        db=object(),
    )

    payload = jwt.decode(result["access_token"], SECRET_KEY, algorithms=[ALGORITHM])
    assert payload["sub"] == email
    assert payload["user_id"] == str(user_id)
