import { addStaff, deleteStaff, listStaff } from '@/db/staff';

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

export async function DELETE(request: Request) {
  try {
    const input = await request.json() as Record<string, unknown>;
    const id = Number(input.id);
    if (!Number.isInteger(id) || id < 1) {
      return Response.json({ error: '削除するスタッフを確認してください' }, { status: 400 });
    }
    return Response.json(await deleteStaff(id));
  } catch (error) {
    console.error(error);
    return Response.json({ error: 'スタッフを削除できませんでした' }, { status: 500 });
  }
}
