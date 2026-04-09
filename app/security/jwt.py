from datetime import datetime, timedelta, timezone
from jose import JWTError, jwt, ExpiredSignatureError
from app.config import JWT_SECRET, JWT_ALG, ACCESS_MINUTES

# We use this function in the user service to create access tokens when a user logs in. It takes the user_id as input and returns a signed JWT with the user_id as the subject, along with issued at and expiration claims. '
# The token is signed using the secret key and algorithm defined in the config.
def create_access_token(user_id: str) -> str:
    now = datetime.now(timezone.utc)
    payload = {
        "sub": user_id,
        "iat": int(now.timestamp()),
        "exp": int((now + timedelta(minutes=ACCESS_MINUTES)).timestamp()),
        "type": "access",
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALG)

# This simply decodes the JWT and retuns the payload as a dictionary.
def decode_access_token(token: str) -> dict:
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALG])
    except ExpiredSignatureError:
        raise ValueError("TOKEN_EXPIRED")
    except JWTError:
        raise ValueError("TOKEN_INVALID")

    if payload.get("type") != "access":
        raise ValueError("TOKEN_WRONG_TYPE")

    if "sub" not in payload:
        raise ValueError("TOKEN_MISSING_SUB")

    return payload

# This function is similar to create_access_token but creates a refresh token that is valid for 7 days. The payload includes a "type" claim to distinguish it from access tokens.
def create_refresh_token(user_id: str) -> str:
    now = datetime.now(timezone.utc)
    payload = {
        "sub": user_id,
        "iat": int(now.timestamp()),
        "exp": int((now + timedelta(days=7)).timestamp()),
        "type": "refresh",
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALG)

# This function checks if refresh token is valid
def check_refresh_token_expiration(token: str) -> dict:
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALG])
    except ExpiredSignatureError:
        raise ValueError("TOKEN_EXPIRED")
    except JWTError:
        raise ValueError("TOKEN_INVALID")
    if payload.get("type") != "refresh":
        raise ValueError("TOKEN_WRONG_TYPE")
    if "sub" not in payload:
        raise ValueError("TOKEN_MISSING_SUB")
    return payload