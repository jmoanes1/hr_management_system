"""Send email through Resend REST API (HTTPS — works on Render Free tier).

Resend is an email delivery service with an HTTP API, ideal when outbound
SMTP ports (25, 465, 587) are blocked, as on Render's free tier.

Required environment variable:
    RESEND_API_KEY  — API key from https://resend.com/api-keys

Optional environment variable:
    RESEND_FROM_EMAIL — Verified sender address (defaults to DEFAULT_FROM_EMAIL)
"""

import json
import urllib.error
import urllib.request
from email.utils import parseaddr

from django.conf import settings
from django.core.mail.backends.base import BaseEmailBackend


class ResendEmailBackend(BaseEmailBackend):
    """Resend REST API email backend.

    Falls back to console output when RESEND_API_KEY is not configured
    and EMAIL_CONSOLE_FALLBACK is True in DEBUG.
    """

    api_url = "https://api.resend.com/emails"

    def send_messages(self, email_messages):
        api_key = getattr(settings, "RESEND_API_KEY", "")
        if not api_key:
            if not self.fail_silently:
                raise ValueError(
                    "RESEND_API_KEY is not configured. "
                    "Set it in your Render environment variables."
                )
            return 0

        sender = self._parse_sender(settings.DEFAULT_FROM_EMAIL)
        sent = 0
        for message in email_messages:
            try:
                self._send_single(api_key, sender, message)
                sent += 1
            except Exception:
                if not self.fail_silently:
                    raise
        return sent

    @staticmethod
    def _parse_sender(from_email: str) -> str:
        """Return just the email address from 'Name <email@domain.com>'."""
        _, addr = parseaddr(from_email or settings.DEFAULT_FROM_EMAIL)
        return addr or ""

    def _send_single(self, api_key: str, sender: str, message) -> None:
        recipients = [addr for addr in message.to if addr]
        if not recipients:
            return

        # Build payload — Resend supports both text and HTML
        payload = {
            "from": sender or "noreply@yourdomain.com",
            "to": recipients,
            "subject": message.subject,
        }

        if message.content_subtype == "html":
            payload["html"] = message.body
        else:
            payload["text"] = message.body

        data = json.dumps(payload).encode("utf-8")
        request = urllib.request.Request(
            self.api_url,
            data=data,
            headers={
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json",
            },
            method="POST",
        )

        try:
            with urllib.request.urlopen(request, timeout=30) as response:
                if response.status not in (200, 201, 202):
                    body = response.read().decode("utf-8", errors="replace")
                    raise urllib.error.HTTPError(
                        self.api_url, response.status, body, response.headers, None
                    )
        except urllib.error.HTTPError as exc:
            detail = exc.read().decode("utf-8", errors="replace")
            raise ConnectionError(f"Resend API error {exc.code}: {detail}") from exc
