const COOKIE_NAME = 'task_board_access';
const COOKIE_MAX_AGE = 60 * 60 * 24 * 30;

function configuredPin() {
  return process.env.SITE_ACCESS_PIN?.trim() ?? '';
}

async function digest(value: string) {
  const bytes = new TextEncoder().encode(value);
  const hash = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(hash), (byte) => byte.toString(16).padStart(2, '0')).join('');
}

async function expectedToken() {
  const pin = configuredPin();
  return pin ? digest(`task-board:${pin}:v1`) : '';
}

function cookieValue(request: Request) {
  const cookieHeader = request.headers.get('cookie') ?? '';
  for (const part of cookieHeader.split(';')) {
    const [name, ...valueParts] = part.trim().split('=');
    if (name === COOKIE_NAME) return decodeURIComponent(valueParts.join('='));
  }
  return '';
}

export function isPinConfigured() {
  return /^\d{4}$/.test(configuredPin());
}

export async function verifyAccessPin(pin: string) {
  const configured = configuredPin();
  if (!/^\d{4}$/.test(configured) || !/^\d{4}$/.test(pin)) return false;
  const [actual, expected] = await Promise.all([
    digest(`pin:${pin}`),
    digest(`pin:${configured}`),
  ]);
  let difference = 0;
  for (let index = 0; index < expected.length; index += 1) {
    difference |= actual.charCodeAt(index) ^ expected.charCodeAt(index);
  }
  return difference === 0;
}

export async function isSiteAuthorized(request: Request) {
  const expected = await expectedToken();
  return Boolean(expected) && cookieValue(request) === expected;
}

export async function accessCookie(request: Request) {
  const token = await expectedToken();
  const secure = new URL(request.url).protocol === 'https:' ? '; Secure' : '';
  return `${COOKIE_NAME}=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${COOKIE_MAX_AGE}${secure}`;
}

export function clearAccessCookie(request: Request) {
  const secure = new URL(request.url).protocol === 'https:' ? '; Secure' : '';
  return `${COOKIE_NAME}=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0${secure}`;
}

export async function requireSiteAccess(request: Request) {
  if (await isSiteAuthorized(request)) return null;
  return Response.json({ error: 'PINを入力してください' }, { status: 401, headers: { 'cache-control': 'no-store' } });
}
