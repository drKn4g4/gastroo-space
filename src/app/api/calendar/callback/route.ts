// src/app/api/calendar/callback/route.ts
// OAuth callback — receives code from Google and passes it back to the opener via postMessage
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  const error = url.searchParams.get('error');

  const html = `<!DOCTYPE html>
<html lang="pl">
<head>
  <meta charset="utf-8">
  <title>Google Calendar – autoryzacja</title>
</head>
<body>
  <script>
    ${
      error
        ? `window.opener?.postMessage(
            { type: 'GCAL_AUTH_ERROR', error: ${JSON.stringify(error)} },
            window.location.origin
          );`
        : `window.opener?.postMessage(
            { type: 'GCAL_AUTH_SUCCESS', code: ${JSON.stringify(code)}, state: ${JSON.stringify(state)} },
            window.location.origin
          );`
    }
    window.close();
  </script>
  <p style="font-family:system-ui,sans-serif;text-align:center;margin-top:10vh;color:#555">
    ${error ? '❌ Autoryzacja nie powiodła się. Możesz zamknąć to okno.' : '✅ Autoryzacja udana. Zamykam okno…'}
  </p>
</body>
</html>`;

  return new NextResponse(html, {
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  });
}
