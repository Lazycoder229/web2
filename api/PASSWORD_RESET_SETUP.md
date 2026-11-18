# Password reset email setup

Admin and customer password reset links can be sent through SMTP or the Brevo HTTPS API. For Render Free, use the Brevo API because outbound SMTP ports are blocked.

For Brevo API sending, add these variables to the API environment:

- `BREVO_API_KEY` with a Brevo API key (not an SMTP key)
- `SMTP_FROM_EMAIL` and `SMTP_FROM_NAME`; the sender address must be verified in Brevo

When `BREVO_API_KEY` is set, the mailer sends through `https://api.brevo.com/v3/smtp/email` over HTTPS. Otherwise it uses SMTP and requires:

- `SMTP_HOST`, `SMTP_PORT`, and `SMTP_ENCRYPTION`
- `SMTP_USERNAME` and `SMTP_PASSWORD`
- `SMTP_FROM_EMAIL` and `SMTP_FROM_NAME`
- `WEB_APP_URL` with the public web app origin

For STARTTLS, use port `587` and `SMTP_ENCRYPTION=tls`. For implicit TLS, use port `465` and `SMTP_ENCRYPTION=ssl`.

After deploying the API code, run the migration from the `api` directory:

```sh
php lava migration run
```

Reset links expire after 60 minutes and can be used once. Successful resets revoke the account's stored refresh tokens.
