import { listCompletionHistory } from '@/db/history';

export async function GET() {
  try {
    return Response.json({ history: await listCompletionHistory() });
  } catch (error) {
    console.error(error);
    return Response.json({ error: '完了履歴を読み込めませんでした' }, { status: 500 });
  }
}
