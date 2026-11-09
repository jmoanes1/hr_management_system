"""
Test Brevo SMTP email delivery and password reset functionality.
"""
from django.core.management.base import BaseCommand, CommandError
from django.core.mail import send_mail
from django.conf import settings
from django.contrib.auth import get_user_model
from accounts.password_reset_email import find_reset_users, send_password_reset_emails

User = get_user_model()


class Command(BaseCommand):
    help = "Test Brevo SMTP email delivery and password reset functionality"

    def add_arguments(self, parser):
        parser.add_argument("--to", type=str, help="Email address to send test email to")
        parser.add_argument(
            "--password-reset-test",
            type=str,
            help="Test password reset email delivery for this email address",
        )
        parser.add_argument(
            "--check-settings",
            action="store_true",
            help="Check email settings configuration without sending email",
        )

    def handle(self, *args, **options):
        self.stdout.write("=" * 60)
        self.stdout.write("Brevo SMTP Email Test")
        self.stdout.write("=" * 60)
        self._check_settings()
        if options["check_settings"]:
            self.stdout.write("Settings check completed.")
            return
        if options["to"]:
            self._test_email_delivery(options["to"])
        if options["password_reset_test"]:
            self._test_password_reset_email(options["password_reset_test"])
        if not options["to"] and not options["password_reset_test"]:
            self.stdout.write(
                "No test specified. Use --to or --password-reset-test."
            )
        self.stdout.write("=" * 60)

    def _check_settings(self):
        self.stdout.write("\n1. Checking email settings...")
        checks = [
            ("EMAIL_BACKEND", settings.EMAIL_BACKEND),
            ("EMAIL_HOST", settings.EMAIL_HOST),
            ("EMAIL_PORT", settings.EMAIL_PORT),
            ("EMAIL_USE_TLS", settings.EMAIL_USE_TLS),
            ("EMAIL_USE_SSL", settings.EMAIL_USE_SSL),
            ("EMAIL_HOST_USER", settings.EMAIL_HOST_USER or "<not set>"),
            ("EMAIL_HOST_PASSWORD", "<set>" if settings.EMAIL_HOST_PASSWORD else "<not set>"),
            ("DEFAULT_FROM_EMAIL", settings.DEFAULT_FROM_EMAIL or "<not set>"),
            ("PASSWORD_RESET_TIMEOUT", settings.PASSWORD_RESET_TIMEOUT),
        ]
        all_ok = True
        for name, value in checks:
            status = "OK" if value and value != "<not set>" else "MISSING"
            if status == "MISSING":
                all_ok = False
            self.stdout.write(f"  {name}: {value} [{status}]")
        if not all_ok:
            self.stdout.write(
                "WARNING: Some email settings are missing. "
                "Configure BREVO_SMTP_LOGIN, BREVO_SMTP_KEY, and DEFAULT_FROM_EMAIL."
            )
        else:
            self.stdout.write("All email settings configured.")

    def _test_email_delivery(self, recipient):
        self.stdout.write(
            f"\n2. Testing SMTP connection to {settings.EMAIL_HOST}:{settings.EMAIL_PORT}..."
        )
        try:
            send_mail(
                subject="Brevo SMTP Test - Employee Directory",
                message=(
                    "This is a test email from your Django HR Management System.\n"
                    "If you received this, Brevo SMTP is configured correctly."
                ),
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=[recipient],
                fail_silently=False,
            )
            self.stdout.write(
                f"Test email sent successfully to {recipient}"
            )
        except Exception as exc:
            self.stdout.write(
                f"SMTP test failed: {type(exc).__name__}"
            )
            self.stdout.write(
                "Check your Brevo SMTP credentials and authorized IPs."
            )
            raise CommandError(f"SMTP test failed: {exc}")

    def _test_password_reset_email(self, email):
        self.stdout.write(f"\n3. Testing password reset email for {email}...")
        users = list(find_reset_users(email))
        if not users:
            self.stdout.write(
                f"No active user found with email {email}. "
                "Password reset email will not be sent (expected for unknown emails)."
            )
            return
        user = users[0]
        self.stdout.write(
            f"Found user: {user.get_username()} (email: {user.email})"
        )
        try:
            send_password_reset_emails(
                users=users,
                form_email=email,
                request=None,
                from_email=settings.DEFAULT_FROM_EMAIL,
                subject_template_name="accounts/emails/password_reset_subject.txt",
                email_template_name="accounts/emails/password_reset_email.txt",
                html_email_template_name="accounts/emails/password_reset_email.html",
                domain_override=None,
                use_https=False,
            )
            self.stdout.write(
                f"Password reset email sent successfully to {email}"
            )
        except Exception as exc:
            self.stdout.write(
                f"Password reset email failed: {type(exc).__name__}"
            )
            raise CommandError(f"Password reset email failed: {exc}")