# PRIME POS React app

This is the plain React/Vite version of the PRIME POS web application.

## Development

```bash
npm install
npm run dev
```

The Vite development server proxies `/backend` and `/uploads` to
`LAVALUST_URL`, defaulting to `http://localhost:3001/api`.

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
