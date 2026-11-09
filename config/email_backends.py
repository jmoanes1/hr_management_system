"""Email backends with Brevo, Resend, and local development fallback."""

import logging

from django.conf import settings
from django.core.mail.backends.base import BaseEmailBackend
from django.core.mail.backends.console import EmailBackend as ConsoleEmailBackend
from django.core.mail.backends.smtp import EmailBackend as SmtpEmailBackend

from config.brevo_email_backend import BrevoAPIEmailBackend
from config.resend_email_backend import ResendEmailBackend

logger = logging.getLogger(__name__)


class VerboseConsoleEmailBackend(ConsoleEmailBackend):
    """Console backend that highlights password-reset links in the terminal."""

    def write_message(self, message):
        super().write_message(message)
        body = message.message().as_string()
        if "password-reset/confirm" in body or "password_reset_confirm" in body:
            for line in body.splitlines():
                if "password-reset" in line or "password_reset" in line:
                    if line.startswith("http"):
                        print("\n" + "=" * 60)
                        print("PASSWORD RESET LINK (copy into browser):")
                        print(line.strip())
                        print("=" * 60 + "\n")


def _brevo_smtp_backend(fail_silently=False):
    """Brevo SMTP relay (xsmtpsib- key + SMTP login)."""
    if not settings.EMAIL_HOST_USER and not settings.EMAIL_HOST_PASSWORD:
        return None
    return SmtpEmailBackend(fail_silently=fail_silently)


def _brevo_api_backend(fail_silently=False):
    """Brevo REST API (xkeysib- API key only)."""
    api_key = getattr(settings, "BREVO_API_KEY", "") or settings.EMAIL_HOST_PASSWORD
    if api_key.startswith("xkeysib"):
        return BrevoAPIEmailBackend(fail_silently=fail_silently)
    return None


def _resend_backend(fail_silently=False):
    """Resend REST API (HTTP — works on Render Free tier where SMTP is blocked)."""
    api_key = getattr(settings, "RESEND_API_KEY", "")
    if api_key:
        return ResendEmailBackend(fail_silently=fail_silently)
    return None


def _should_use_console_fallback() -> bool:
    return getattr(settings, "EMAIL_CONSOLE_FALLBACK", False) and settings.DEBUG


class ResilientEmailBackend(BaseEmailBackend):
    """
    Deliver mail through the best available backend.

    Order of preference:
    1. Resend HTTP API (works on Render Free — no SMTP port needed)
    2. Brevo SMTP relay
    3. Brevo REST API
    4. Console fallback (only when EMAIL_CONSOLE_FALLBACK=True in DEBUG)
    """

    def __init__(self, *args, fail_silently=False, **kwargs):
        super().__init__(fail_silently=fail_silently, **kwargs)
        self._resend = _resend_backend(fail_silently=fail_silently)
        self._smtp = _brevo_smtp_backend(fail_silently=fail_silently)
        self._api = _brevo_api_backend(fail_silently=fail_silently)
        self._console = VerboseConsoleEmailBackend(fail_silently=fail_silently)

    def send_messages(self, email_messages):
        if not email_messages:
            return 0

        errors = []

        # 1. Try Resend HTTP API first (best for Render Free — no SMTP port)
        if self._resend:
            try:
                sent = self._resend.send_messages(email_messages)
                if sent:
                    logger.info("Email sent via Resend API.")
                    print("[Email] Sent via Resend API.")
                    return sent
            except Exception as exc:
                errors.append(f"Resend: {exc}")
                logger.warning("Resend API failed: %s", exc)
                print(f"[Email] Resend API failed: {exc}")

        # 2. Try Brevo SMTP relay
        if self._smtp:
            try:
                sent = self._smtp.send_messages(email_messages)
                if sent:
                    logger.info("Email sent via Brevo SMTP.")
                    print("[Email] Sent via Brevo SMTP.")
                    return sent
            except Exception as exc:
                errors.append(f"SMTP: {exc}")
                logger.warning("Brevo SMTP failed: %s", exc)
                print(f"[Email] Brevo SMTP failed: {exc}")

        # 3. Try Brevo REST API
        if self._api:
            try:
                sent = self._api.send_messages(email_messages)
                if sent:
                    logger.info("Email sent via Brevo API.")
                    print("[Email] Sent via Brevo API.")
                    return sent
            except Exception as exc:
                errors.append(f"API: {exc}")
                logger.warning("Brevo API failed: %s", exc)
                print(f"[Email] Brevo API failed: {exc}")

        # 4. Console fallback (DEBUG only, does NOT deliver to real inbox)
        if _should_use_console_fallback():
            logger.warning(
                "EMAIL_CONSOLE_FALLBACK is enabled — email was NOT delivered to inbox."
            )
            print(
                "\n[Email] WARNING: All email backends failed. Printing to console only "
                "(set EMAIL_CONSOLE_FALLBACK=false and configure Resend or Brevo).\n"
            )
            return self._console.send_messages(email_messages)

        detail = "; ".join(errors) or "No email backend is configured."
        if self.fail_silently:
            return 0
        raise ConnectionError(
            f"Could not send email. {detail} "
            "Set RESEND_API_KEY in your Render environment variables (recommended), "
            "or configure Brevo SMTP credentials and authorize your IP. "
            "Run: python manage.py brevo_email_setup"
        )
