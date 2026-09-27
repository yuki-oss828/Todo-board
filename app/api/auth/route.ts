import { accessCookie, clearAccessCookie, isPinConfigured, isSiteAuthorized, verifyAccessPin } from '@/lib/site-auth';

export async function GET(request: Request) {
  const authenticated = await isSiteAuthorized(request);
  return Response.json(
    { authenticated, configured: isPinConfigured() },
    { status: authenticated ? 200 : 401, headers: { 'cache-control': 'no-store' } },
  );
}

export async function POST(request: Request) {
  if (!isPinConfigured()) {
    return Response.json({ error: 'アクセスPINが未設定です' }, { status: 503 });
  }

  const input = await request.json() as { pin?: unknown };
  const pin = typeof input.pin === 'string' ? input.pin.trim() : '';
  if (await verifyAccessPin(pin)) {
    return Response.json(
      { authenticated: true },
      { headers: { 'set-cookie': await accessCookie(request), 'cache-control': 'no-store' } },
    );
  }

  return Response.json(
    { error: 'PINが違います' },
    { status: 401, headers: { 'cache-control': 'no-store' } },
  );
}

export async function DELETE(request: Request) {
  return Response.json(
    { authenticated: false },
    { headers: { 'set-cookie': clearAccessCookie(request), 'cache-control': 'no-store' } },
  );
}
