import { listCompletionHistory } from '@/db/history';
import { requireSiteAccess } from '@/lib/site-auth';

export async function GET(request: Request) {
  const denied = await requireSiteAccess(request);
  if (denied) return denied;
  try {
    return Response.json({ history: await listCompletionHistory() });
  } catch (error) {
    console.error(error);
    return Response.json({ error: '完了履歴を読み込めませんでした' }, { status: 500 });
  }
}
