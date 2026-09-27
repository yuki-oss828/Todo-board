import { createTask, deleteTask, listTasks, updateTask, updateTaskStatus, type TaskPriority, type TaskStatus } from '@/db/tasks';
import { requireSiteAccess } from '@/lib/site-auth';

const statuses = new Set<TaskStatus>(['todo', 'doing', 'done']);
const priorities = new Set<TaskPriority>(['normal', 'high']);
const datePattern = /^\d{4}-\d{2}-\d{2}$/;

function todayInTokyo() {
  return new Intl.DateTimeFormat('en-CA', { year: 'numeric', month: '2-digit', day: '2-digit', timeZone: 'Asia/Tokyo' }).format(new Date());
}

export async function GET(request: Request) {
  const denied = await requireSiteAccess(request);
  if (denied) return denied;
  try {
    const requestedDate = new URL(request.url).searchParams.get('date') ?? todayInTokyo();
    if (!datePattern.test(requestedDate)) {
      return Response.json({ error: '日付を確認してください' }, { status: 400 });
    }
    return Response.json({ tasks: await listTasks(requestedDate), workDate: requestedDate });
  } catch (error) {
    console.error(error);
    return Response.json({ error: '作業一覧を読み込めませんでした' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const denied = await requireSiteAccess(request);
  if (denied) return denied;
  try {
    const input = await request.json() as Record<string, unknown>;
    const title = typeof input.title === 'string' ? input.title.trim() : '';
    const category = typeof input.category === 'string' ? input.category.trim() : '';
    const assignee = typeof input.assignee === 'string' ? input.assignee.trim() : '';
    const dueTime = typeof input.dueTime === 'string' ? input.dueTime : '';
    const priority = input.priority as TaskPriority;
    const workDate = typeof input.workDate === 'string' ? input.workDate : '';
    const repeatDaily = input.repeatDaily === true;
    if (!title || title.length > 100 || !category || (dueTime !== '' && !/^\d{2}:\d{2}$/.test(dueTime)) || !priorities.has(priority) || !datePattern.test(workDate)) {
      return Response.json({ error: '入力内容を確認してください' }, { status: 400 });
    }
    return Response.json({ task: await createTask({ title, category, assignee, dueTime, priority, workDate, repeatDaily }) }, { status: 201 });
  } catch (error) {
    console.error(error);
    return Response.json({ error: '作業を追加できませんでした' }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  const denied = await requireSiteAccess(request);
  if (denied) return denied;
  try {
    const input = await request.json() as Record<string, unknown>;
    const id = Number(input.id);
    const status = input.status as TaskStatus;
    const completedBy = typeof input.completedBy === 'string' ? input.completedBy.trim() : '';
    if (!Number.isInteger(id) || id < 1 || !statuses.has(status)) {
      return Response.json({ error: '入力内容を確認してください' }, { status: 400 });
    }
    if (status === 'done' && !completedBy) {
      return Response.json({ error: '完了者を選んでください' }, { status: 400 });
    }
    return Response.json({ task: await updateTaskStatus(id, status, completedBy) });
  } catch (error) {
    console.error(error);
    return Response.json({ error: '状態を更新できませんでした' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  const denied = await requireSiteAccess(request);
  if (denied) return denied;
  try {
    const input = await request.json() as Record<string, unknown>;
    const id = Number(input.id);
    const title = typeof input.title === 'string' ? input.title.trim() : '';
    const category = typeof input.category === 'string' ? input.category.trim() : '';
    const assignee = typeof input.assignee === 'string' ? input.assignee.trim() : '';
    const dueTime = typeof input.dueTime === 'string' ? input.dueTime : '';
    const priority = input.priority as TaskPriority;
    const repeatDaily = input.repeatDaily === true;
    if (!Number.isInteger(id) || id < 1 || !title || title.length > 100 || !category || (dueTime !== '' && !/^\d{2}:\d{2}$/.test(dueTime)) || !priorities.has(priority)) {
      return Response.json({ error: '入力内容を確認してください' }, { status: 400 });
    }
    return Response.json({ task: await updateTask({ id, title, category, assignee, dueTime, priority, repeatDaily }) });
  } catch (error) {
    console.error(error);
    return Response.json({ error: '作業を修正できませんでした' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  const denied = await requireSiteAccess(request);
  if (denied) return denied;
  try {
    const input = await request.json() as Record<string, unknown>;
    const id = Number(input.id);
    if (!Number.isInteger(id) || id < 1) {
      return Response.json({ error: '入力内容を確認してください' }, { status: 400 });
    }
    return Response.json({ task: await deleteTask(id) });
  } catch (error) {
    console.error(error);
    return Response.json({ error: '作業を削除できませんでした' }, { status: 500 });
  }
}
