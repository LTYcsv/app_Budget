import hashlib
import logging

from .config import settings

logger = logging.getLogger(__name__)


def send_password_reset_email(to: str, token: str) -> None:
    if not settings.resend_api_key:
        # Log email hash, not plaintext — avoids leaking PII to log systems
        email_hash = hashlib.sha256(to.lower().encode()).hexdigest()[:16]
        logger.warning(
            '[EMAIL] RESEND_API_KEY not configured — password reset email NOT sent '
            '(email_sha256=%s)', email_hash
        )
        return

    import resend  # lazy import — only needed when key is set

    resend.api_key = settings.resend_api_key
    reset_url = f'{settings.frontend_url}/reset-password?token={token}'

    resend.Emails.send({
        'from': settings.from_email,
        'to': to,
        'subject': 'Сброс пароля — Чек',
        'html': _build_html(reset_url, to),
    })


def _build_html(reset_url: str, email: str) -> str:
    return f"""<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1"/>
  <title>Сброс пароля</title>
</head>
<body style="margin:0;padding:0;background:#08090F;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#08090F;padding:48px 16px;">
    <tr>
      <td align="center">
        <table width="100%" style="max-width:480px;">

          <!-- Logo -->
          <tr>
            <td align="center" style="padding-bottom:32px;">
              <div style="width:56px;height:56px;border-radius:18px;background:#0E1220;border:1px solid rgba(91,158,240,0.2);
                          display:inline-flex;align-items:center;justify-content:center;
                          box-shadow:0 8px 24px rgba(91,158,240,0.15);">
                <span style="font-size:28px;font-weight:900;color:#5B9EF0;font-family:sans-serif;">Ч</span>
              </div>
            </td>
          </tr>

          <!-- Card -->
          <tr>
            <td style="background:#0E1220;border:1px solid rgba(91,158,240,0.12);border-radius:20px;padding:36px 32px;">

              <h1 style="margin:0 0 8px;font-size:22px;font-weight:700;color:#F2EDE4;letter-spacing:-0.02em;">
                Сброс пароля
              </h1>
              <p style="margin:0 0 24px;font-size:14px;color:rgba(242,237,228,0.5);line-height:1.6;">
                Мы получили запрос на сброс пароля для аккаунта&nbsp;<strong style="color:rgba(242,237,228,0.75);">{email}</strong>.
              </p>

              <!-- Button -->
              <a href="{reset_url}"
                 style="display:block;text-align:center;background:#5B9EF0;color:#fff;font-size:15px;
                        font-weight:600;padding:14px 24px;border-radius:14px;text-decoration:none;
                        box-shadow:0 6px 20px rgba(91,158,240,0.35);margin-bottom:24px;">
                Сбросить пароль
              </a>

              <p style="margin:0 0 8px;font-size:13px;color:rgba(242,237,228,0.4);line-height:1.6;">
                Ссылка действительна <strong style="color:rgba(242,237,228,0.6);">1 час</strong>.
                Если ты не запрашивал сброс пароля — просто проигнорируй это письмо.
              </p>

              <!-- Divider -->
              <div style="margin:24px 0;height:1px;background:rgba(91,158,240,0.1);"></div>

              <p style="margin:0;font-size:12px;color:rgba(242,237,228,0.3);word-break:break-all;">
                Или скопируй ссылку в браузер:<br/>
                <span style="color:rgba(91,158,240,0.6);">{reset_url}</span>
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td align="center" style="padding-top:24px;">
              <p style="margin:0;font-size:12px;color:rgba(242,237,228,0.2);">
                © 2025 Чек — умный учёт финансов
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>"""
