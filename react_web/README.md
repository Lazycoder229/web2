# PRIME POS React app

This is the plain React/Vite version of the PRIME POS web application.

## Development

```bash
npm install
npm run dev
```

The Vite development server proxies `/backend` and `/uploads` to
`LAVALUST_URL`, defaulting to `http://localhost:3001/api`.

## Login reCAPTCHA deployment

The admin login uses Google reCAPTCHA v2 Checkbox. Configure both deployment
environments with keys from the same reCAPTCHA site:

- In the frontend build environment, set `VITE_RECAPTCHA_ENABLED=true` and
  `VITE_RECAPTCHA_SITE_KEY` to the **site key**. Add the deployed web domain to
  the allowed domains for that key, then rebuild and redeploy the frontend.
- In the API environment, set `RECAPTCHA_REQUIRED=true` and
  `RECAPTCHA_SECRET_KEY` to the matching **secret key**. Keep the secret only on
  the server; never put it in a `VITE_` variable.
- The API server must be able to make HTTPS requests to Google's
  `www.google.com/recaptcha/api/siteverify` endpoint.
- If deploying the API with the included Dockerfile, rebuild the image after
  changes so the PHP cURL extension is installed for server-side verification.

If reCAPTCHA is intentionally disabled for local development, set
`VITE_RECAPTCHA_ENABLED=false` in the frontend and `RECAPTCHA_REQUIRED=false`
in the API. Do not disable it on a public production deployment.

## Adding components

To add components to your app, run the following command:

```bash
npx shadcn@latest add button
```

This will place the ui components in the `components` directory.

## Using components

To use the components in your app, import them as follows:

```tsx
import { Button } from "@/components/ui/button";
```
