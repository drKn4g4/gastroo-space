// src/app/api/drive/callback/route.ts
// OAuth callback route — receives auth code from Google and sends it back to the opener via postMessage
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  const error = url.searchParams.get('error');

  // HTML page that immediately sends message to opener and closes itself
  const html = `<!DOCTYPE html>
<html>
<head><title>Google Drive Authorization</title></head>
<body>
  <script>
    ${error
      ? `window.opener?.postMessage({ type: 'DRIVE_AUTH_ERROR', error: ${JSON.stringify(error)} }, window.location.origin);`
      : `window.opener?.postMessage({ type: 'DRIVE_AUTH_SUCCESS', code: ${JSON.stringify(code)}, state: ${JSON.stringify(state)} }, window.location.origin);`
    }
    window.close();
  </script>
  <p style="font-family:sans-serif;text-align:center;margin-top:calc(40 / 1024 * 100vh)">
    ${error ? '❌ Authorization failed. You can close this window.' : '✅ Authorization successful. Closing…'}
  </p>
</body>
</html>`;

  return new NextResponse(html, {
    headers: { 'Content-Type': 'text/html' },
  });
}
