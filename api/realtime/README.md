# Prime POS realtime service

This small Render web service broadcasts invalidation events to connected POS screens. The PHP API publishes events after committed order or stock changes. WebSocket messages contain event names only; clients then reload their data through the existing authenticated API.

## Deploy

Create a separate Render Web Service from this repository with root directory `api/realtime`, build command `npm install`, and start command `npm start`. Keep it at one instance until a shared pub/sub service is added. Set:

- `REALTIME_PUBLISH_SECRET`: a long random secret shared with the PHP API.
- `WS_ALLOWED_ORIGINS`: comma-separated frontend origins, for example `https://your-site.vercel.app,http://localhost:5173`.

After deploy, set these environment variables on the PHP API service:

- `REALTIME_PUBLISH_URL`: `https://<realtime-service>.onrender.com/publish`
- `REALTIME_PUBLISH_SECRET`: the same secret.

Set `VITE_REALTIME_URL` on the frontend build service to `wss://<realtime-service>.onrender.com/ws`. Rebuild the frontend after changing it. Local development can omit this variable and use the Vite `/ws` proxy to `ws://127.0.0.1:3002`; run this service locally with `npm install` and `npm start` from `api/realtime`.

If the WebSocket service is unreachable, affected screens fall back to their existing polling refreshes. The database transaction remains responsible for stock correctness.
