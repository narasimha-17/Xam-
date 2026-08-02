import asyncio
import logging
import smtplib
from email.mime.text import MIMEText

from app.core.config import settings

logger = logging.getLogger("app.email")


def _send_sync(to_email: str, subject: str, body: str) -> None:
    msg = MIMEText(body)
    msg["Subject"] = subject
    msg["From"] = settings.smtp_from_email or settings.smtp_username
    msg["To"] = to_email

    with smtplib.SMTP(settings.smtp_host, settings.smtp_port, timeout=15) as server:
        if settings.smtp_use_tls:
            server.starttls()
        server.login(settings.smtp_username, settings.smtp_password)
        server.send_message(msg)


async def send_email(to_email: str, subject: str, body: str) -> bool:
    """Sends an email via SMTP. Returns True if sent, False if SMTP isn't configured
    or sending failed — callers should fall back to logging in that case rather
    than surfacing an error to the requester (never leak whether email delivery
    succeeded to the client, for the same reason password-reset responses are generic)."""
    if not settings.smtp_host or not settings.smtp_username or not settings.smtp_password:
        return False
    try:
        await asyncio.to_thread(_send_sync, to_email, subject, body)
        return True
    except Exception:
        logger.exception("Failed to send email to %s", to_email)
        return False
