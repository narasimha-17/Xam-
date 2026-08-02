import logging

import httpx

from app.core.config import settings

logger = logging.getLogger("app.email")

BREVO_API_URL = "https://api.brevo.com/v3/smtp/email"


async def send_email(to_email: str, subject: str, body: str) -> bool:
    """Sends an email via Brevo's HTTP API. Returns True if sent, False if the API
    key isn't configured or sending failed — callers should fall back to logging in
    that case rather than surfacing an error to the requester (never leak whether
    email delivery succeeded to the client, for the same reason password-reset
    responses are generic).

    Uses an HTTPS API rather than SMTP because many free-tier hosts (Render
    included) block outbound SMTP ports (587/465/25) at the network level.
    """
    if not settings.brevo_api_key or not settings.email_from_address:
        return False

    payload = {
        "sender": {"email": settings.email_from_address, "name": "Xam+"},
        "to": [{"email": to_email}],
        "subject": subject,
        "textContent": body,
    }
    headers = {"api-key": settings.brevo_api_key, "Content-Type": "application/json", "Accept": "application/json"}

    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            resp = await client.post(BREVO_API_URL, json=payload, headers=headers)
            resp.raise_for_status()
        return True
    except Exception:
        logger.exception("Failed to send email to %s", to_email)
        return False
