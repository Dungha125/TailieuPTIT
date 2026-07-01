import logging
import secrets
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

from app.config import settings

logger = logging.getLogger(__name__)


def _smtp_configured() -> bool:
    return bool(settings.smtp_host and settings.smtp_from)


def send_email(to: str, subject: str, html_body: str) -> bool:
    if not _smtp_configured():
        logger.info("Email (dev log) to=%s subject=%s", to, subject)
        logger.debug("Body: %s", html_body)
        return True

    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"] = settings.smtp_from
    msg["To"] = to
    msg.attach(MIMEText(html_body, "html", "utf-8"))

    try:
        with smtplib.SMTP(settings.smtp_host, settings.smtp_port, timeout=15) as server:
            if settings.smtp_use_tls:
                server.starttls()
            if settings.smtp_user and settings.smtp_password:
                server.login(settings.smtp_user, settings.smtp_password)
            server.sendmail(settings.smtp_from, [to], msg.as_string())
        return True
    except Exception as e:
        logger.error("Failed to send email to %s: %s", to, e)
        return False


def generate_token() -> str:
    return secrets.token_urlsafe(32)


def send_verification_email(email: str, full_name: str, token: str) -> bool:
    link = f"{settings.frontend_url.rstrip('/')}/verify-email?token={token}"
    body = f"""
    <p>Xin chào {full_name},</p>
    <p>Nhấn vào liên kết sau để xác thực email:</p>
    <p><a href="{link}">{link}</a></p>
    <p>Liên kết có hiệu lực 24 giờ.</p>
    """
    return send_email(email, "Xác thực tài khoản TailieuPTIT", body)


def send_password_reset_email(email: str, full_name: str, token: str) -> bool:
    link = f"{settings.frontend_url.rstrip('/')}/reset-password?token={token}"
    body = f"""
    <p>Xin chào {full_name or email},</p>
    <p>Nhấn vào liên kết sau để đặt lại mật khẩu:</p>
    <p><a href="{link}">{link}</a></p>
    <p>Liên kết có hiệu lực 1 giờ.</p>
    """
    return send_email(email, "Đặt lại mật khẩu TailieuPTIT", body)
