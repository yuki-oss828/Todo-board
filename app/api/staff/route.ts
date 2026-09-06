import { addStaff, listStaff } from '@/db/staff';

export async function GET() {
  try {
    return Response.json({ staff: await listStaff() });
  } catch (error) {
    console.error(error);
    return Response.json({ error: 'スタッフ一覧を読み込めませんでした' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const input = await request.json() as Record<string, unknown>;
    const name = typeof input.name === 'string' ? input.name.trim() : '';
    if (!name || name.length > 30) {
      return Response.json({ error: '名前を入力してください' }, { status: 400 });
    }
    return Response.json({ staffMember: await addStaff(name) }, { status: 201 });
  } catch (error) {
    console.error(error);
    const message = error instanceof Error && /UNIQUE/.test(error.message) ? '同じ名前のスタッフがいます' : 'スタッフを追加できませんでした';
    return Response.json({ error: message }, { status: 409 });
  }
}
