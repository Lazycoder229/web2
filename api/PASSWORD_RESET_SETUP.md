# Password reset email setup

Admin and customer password reset links are sent through SMTP. Copy `api/.env.example` to `api/.env` and configure:

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
