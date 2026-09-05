import json

import firebase_admin
from firebase_admin import credentials

from app.core.config import settings

_app: firebase_admin.App | None = None


def get_firebase_app() -> firebase_admin.App:
    """Lazily initializes the Firebase Admin SDK from FIREBASE_SERVICE_ACCOUNT_JSON.

    Raises immediately (rather than silently no-op'ing) if the credential is missing
    or malformed, since every authenticated request depends on this succeeding.
    """
    global _app
    if _app is not None:
        return _app

    if not settings.firebase_service_account_json:
        raise RuntimeError(
            "FIREBASE_SERVICE_ACCOUNT_JSON is not set — the Firebase Admin SDK can't verify login tokens "
            "without it. Generate a service account key in the Firebase console (Project settings > "
            "Service accounts) and set its full JSON content as this env var."
        )
    try:
        service_account_info = json.loads(settings.firebase_service_account_json)
    except json.JSONDecodeError as exc:
        raise RuntimeError(f"FIREBASE_SERVICE_ACCOUNT_JSON is not valid JSON: {exc}") from exc

    _app = firebase_admin.initialize_app(credentials.Certificate(service_account_info))
    return _app
