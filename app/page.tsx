'use client';

import { type FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  Check,
  ChefHat,
  Flame,
  History,
  LayoutList,
  LockKeyhole,
  MoreHorizontal,
  Pencil,
  Plus,
  Repeat2,
  Sparkles,
  Trash2,
  UserPlus,
  UserRoundCheck,
  Users,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';

type Status = 'todo' | 'doing' | 'done';
type Priority = 'normal' | 'high';
type Task = {
  id: number;
  title: string;
  category: string;
  assignee: string;
  dueTime: string;
  status: Status;
  priority: Priority;
  workDate: string;
  templateId: string | null;
  repeatDaily: boolean;
};
type StaffMember = { id: number; name: string };
type CompletionRecord = {
  id: number;
  taskId: number | null;
  taskTitle: string;
  completedBy: string;
  completedAt: string;
};
type TaskDraft = Omit<Task, 'id' | 'status' | 'workDate' | 'templateId'>;

function todayKey() {
  return new Intl.DateTimeFormat('en-CA', { year: 'numeric', month: '2-digit', day: '2-digit', timeZone: 'Asia/Tokyo' }).format(new Date());
}

function formatWorkDate(value: string) {
  return new Intl.DateTimeFormat('ja-JP', { month: 'long', day: 'numeric', weekday: 'short', timeZone: 'Asia/Tokyo' }).format(new Date(`${value}T12:00:00+09:00`));
}

const initialWorkDate = todayKey();

const initialStaff: StaffMember[] = [];

const initialTasks: Task[] = [
  { id: 1, title: 'カウンターを拭く', category: '開店前', assignee: '', dueTime: '', status: 'todo', priority: 'normal', workDate: initialWorkDate, templateId: 'opening-counter', repeatDaily: true },
  { id: 2, title: 'ビールの調整をする', category: '開店前', assignee: '', dueTime: '', status: 'todo', priority: 'normal', workDate: initialWorkDate, templateId: 'opening-beer', repeatDaily: true },
  { id: 3, title: '伝票を確認する', category: '開店前', assignee: '', dueTime: '', status: 'todo', priority: 'normal', workDate: initialWorkDate, templateId: 'opening-slips', repeatDaily: true },
  { id: 4, title: '部屋をセットする', category: '開店前', assignee: '', dueTime: '', status: 'todo', priority: 'normal', workDate: initialWorkDate, templateId: 'opening-rooms', repeatDaily: true },
  { id: 5, title: '氷を用意する', category: '開店前', assignee: '', dueTime: '', status: 'todo', priority: 'normal', workDate: initialWorkDate, templateId: 'opening-ice', repeatDaily: true },
  { id: 6, title: 'コース料理を確認する', category: '開店前', assignee: '', dueTime: '', status: 'todo', priority: 'normal', workDate: initialWorkDate, templateId: 'opening-course', repeatDaily: true },
  { id: 7, title: '1階トイレを確認する', category: '開店前', assignee: '', dueTime: '', status: 'todo', priority: 'normal', workDate: initialWorkDate, templateId: 'opening-toilet-1f', repeatDaily: true },
  { id: 8, title: '2階のおしぼりウォーマーの電源を入れる', category: '開店前', assignee: '', dueTime: '', status: 'todo', priority: 'normal', workDate: initialWorkDate, templateId: 'opening-towels-2f', repeatDaily: true },
  { id: 9, title: '2階のエアコンをつける', category: '開店前', assignee: '', dueTime: '', status: 'todo', priority: 'normal', workDate: initialWorkDate, templateId: 'opening-ac-2f', repeatDaily: true },
  { id: 10, title: '2階トイレを確認する', category: '開店前', assignee: '', dueTime: '', status: 'todo', priority: 'normal', workDate: initialWorkDate, templateId: 'opening-toilet-2f', repeatDaily: true },
];

const filters = [
  { id: 'all', label: 'すべて' },
  { id: 'open', label: '未完了' },
  { id: 'unassigned', label: '担当未定' },
  { id: 'done', label: '完了' },
] as const;

const categoryFilters = [
  { id: '開店前', label: '開店前' },
  { id: '締め', label: '締め' },
  { id: 'all', label: 'すべて' },
] as const;

const statusLabel: Record<Status, string> = { todo: '未着手', doing: '作業中', done: '完了' };
const avatarTones = [
  'bg-[#dcecff] text-[#16579d]',
  'bg-[#efe4ff] text-[#7040aa]',
  'bg-[#dff6e8] text-[#187147]',
  'bg-[#ffe6d8] text-[#a94816]',
  'bg-[#fff0c9] text-[#856009]',
  'bg-[#dff4f6] text-[#17636b]',
];

function emptyDraft(): TaskDraft {
  return { title: '', category: '開店前', assignee: '', dueTime: '', priority: 'normal', repeatDaily: true };
}

function staffTone(index: number) {
  return avatarTones[index % avatarTones.length];
}

function formatCompletedAt(value: string) {
  const iso = value.includes('T') ? value : `${value.replace(' ', 'T')}Z`;
  return new Intl.DateTimeFormat('ja-JP', {
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Asia/Tokyo',
  }).format(new Date(iso));
}

async function errorMessage(response: Response, fallback: string) {
  try {
    const body = await response.json() as { error?: string };
    return body.error ?? fallback;
  } catch {
    return fallback;
  }
}

function PersonAvatar({ member, index, size = 'md' }: { member: StaffMember; index: number; size?: 'sm' | 'md' }) {
  return (
    <span className={`grid shrink-0 place-items-center rounded-full font-bold ${size === 'sm' ? 'size-8 text-xs' : 'size-9 text-xs'} ${staffTone(index)}`}>
      {member.name.slice(0, 1)}
    </span>
  );
}

function TaskFields({ prefix, draft, setDraft, staff }: { prefix: string; draft: TaskDraft; setDraft: (draft: TaskDraft) => void; staff: StaffMember[] }) {
  return (
    <div className="grid gap-4 py-2">
      <label htmlFor={`${prefix}-title`} className="grid gap-2 text-sm font-semibold">
        作業内容
        <Input id={`${prefix}-title`} value={draft.title} onChange={(event) => setDraft({ ...draft, title: event.target.value })} placeholder="例：キャベツを千切りにする" className="h-11" />
      </label>
      <label htmlFor={`${prefix}-category`} className="grid gap-2 text-sm font-semibold">
        カテゴリ
        <Select value={draft.category} onValueChange={(value) => setDraft({ ...draft, category: value ?? '開店前' })}>
          <SelectTrigger id={`${prefix}-category`} className="h-11 w-full"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="開店前">開店前</SelectItem>
            <SelectItem value="締め">締め</SelectItem>
          </SelectContent>
        </Select>
      </label>
      <label htmlFor={`${prefix}-assignee`} className="grid gap-2 text-sm font-semibold">
        担当者
        <Select value={draft.assignee || '__none__'} onValueChange={(value) => setDraft({ ...draft, assignee: value === '__none__' ? '' : (value ?? '') })}>
          <SelectTrigger id={`${prefix}-assignee`} className="h-11 w-full"><SelectValue placeholder="あとで決める" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="__none__">あとで決める</SelectItem>
            {staff.map((person) => <SelectItem key={person.id} value={person.name}>{person.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </label>
      <label className="flex cursor-pointer items-center gap-3 rounded-xl border bg-slate-50 p-3 text-sm font-semibold">
        <input type="checkbox" checked={draft.priority === 'high'} onChange={(event) => setDraft({ ...draft, priority: event.target.checked ? 'high' : 'normal' })} className="size-4 accent-[#ed6a45]" />
        <Flame className="size-4 text-[#df5631]" aria-hidden="true" /> 急ぎの作業にする
      </label>
      <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-[#b9d4ff] bg-[#f1f6ff] p-3 text-sm font-semibold text-[#174d91]">
        <input type="checkbox" checked={draft.repeatDaily} onChange={(event) => setDraft({ ...draft, repeatDaily: event.target.checked })} className="size-4 accent-[#1269e8]" />
        <Repeat2 className="size-4" aria-hidden="true" />
        <span>毎日繰り返す<span className="mt-0.5 block text-xs font-medium text-[#5377a4]">完了しても、翌日に未完了で自動登録します</span></span>
      </label>
    </div>
  );
}

export default function Home() {
  const [authStatus, setAuthStatus] = useState<'checking' | 'authenticated' | 'unauthenticated'>('checking');
  const [accessPin, setAccessPin] = useState('');
  const [authError, setAuthError] = useState('');
  const [authSubmitting, setAuthSubmitting] = useState(false);
  const [tasks, setTasks] = useState(initialTasks);
  const [workDate, setWorkDate] = useState(initialWorkDate);
  const [staff, setStaff] = useState(initialStaff);
  const [history, setHistory] = useState<CompletionRecord[]>([]);
  const [filter, setFilter] = useState<(typeof filters)[number]['id']>('open');
  const [categoryFilter, setCategoryFilter] = useState<(typeof categoryFilters)[number]['id']>('開店前');
  const [addTaskOpen, setAddTaskOpen] = useState(false);
  const [staffOpen, setStaffOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [editTask, setEditTask] = useState<Task | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Task | null>(null);
  const [staffDeleteTarget, setStaffDeleteTarget] = useState<StaffMember | null>(null);
  const [completeTask, setCompleteTask] = useState<Task | null>(null);
  const [completedBy, setCompletedBy] = useState('');
  const [notice, setNotice] = useState('');
  const [saving, setSaving] = useState(false);
  const [draft, setDraft] = useState<TaskDraft>(emptyDraft());
  const [editDraft, setEditDraft] = useState<TaskDraft>(emptyDraft());
  const [newStaffName, setNewStaffName] = useState('');

  const today = formatWorkDate(workDate);
  const categoryTasks = useMemo(
    () => categoryFilter === 'all' ? tasks : tasks.filter((task) => task.category === categoryFilter),
    [categoryFilter, tasks],
  );
  const completed = categoryTasks.filter((task) => task.status === 'done').length;
  const progress = categoryTasks.length ? Math.round((completed / categoryTasks.length) * 100) : 0;
  const unassignedCount = categoryTasks.filter((task) => !task.assignee && task.status !== 'done').length;
  const visibleTasks = useMemo(() => {
    const statusFiltered = filter === 'open'
      ? categoryTasks.filter((task) => task.status !== 'done')
      : filter === 'unassigned'
        ? categoryTasks.filter((task) => !task.assignee)
        : filter === 'done'
          ? categoryTasks.filter((task) => task.status === 'done')
          : categoryTasks;

    return statusFiltered;
  }, [categoryTasks, filter]);

  const loadHistory = useCallback(async () => {
    const response = await fetch('/api/history');
    if (!response.ok) throw new Error('history failed');
    const data = await response.json() as { history: CompletionRecord[] };
    setHistory(data.history);
  }, []);

  useEffect(() => {
    let active = true;
    fetch('/api/auth', { cache: 'no-store' })
      .then((response) => { if (active) setAuthStatus(response.ok ? 'authenticated' : 'unauthenticated'); })
      .catch(() => { if (active) setAuthStatus('unauthenticated'); });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (authStatus !== 'authenticated') return;
    let active = true;
    const loadPeople = async () => {
      const staffResponse = await fetch('/api/staff');
      if (!staffResponse.ok) throw new Error('staff failed');
      const staffData = await staffResponse.json() as { staff: StaffMember[] };
      if (!active) return;
      setStaff(staffData.staff);
    };
    void loadPeople().catch(() => { if (active) setNotice('エラー：スタッフ一覧を読み込めませんでした'); });
    return () => { active = false; };
  }, [authStatus]);

  useEffect(() => {
    if (authStatus !== 'authenticated') return;
    let active = true;
    fetch(`/api/tasks?date=${workDate}`)
      .then(async (response) => {
        if (!response.ok) throw new Error('tasks failed');
        return response.json() as Promise<{ tasks: Task[] }>;
      })
      .then(async (data) => {
        if (active) setTasks(data.tasks);
        try {
          await loadHistory();
        } catch {
          if (active) setNotice('エラー：完了履歴を読み込めませんでした');
        }
      })
      .catch(() => { if (active) setNotice('エラー：今日の作業を読み込めませんでした'); });
    return () => { active = false; };
  }, [authStatus, loadHistory, workDate]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      const nextDate = todayKey();
      setWorkDate((current) => {
        if (current === nextDate) return current;
        return nextDate;
      });
    }, 60_000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (authStatus !== 'authenticated') return;
    type WebMcpContext = { registerTool: (tool: Record<string, unknown>, options?: { signal?: AbortSignal }) => void | Promise<void> };
    const context = (document as unknown as { modelContext?: WebMcpContext }).modelContext;
    if (!context?.registerTool) return;
    const lifecycle = new AbortController();
    const register = (tool: Record<string, unknown>) => { void Promise.resolve(context.registerTool(tool, { signal: lifecycle.signal })).catch(() => undefined); };

    register({
      name: 'create_task',
      title: '作業を追加',
      description: '今日の作業を1件追加し、画面の一覧にも反映します。',
      inputSchema: {
        type: 'object',
        properties: {
          title: { type: 'string', minLength: 1, maxLength: 100 },
          category: { type: 'string', minLength: 1, maxLength: 30 },
          assignee: { type: 'string' },
          dueTime: { type: 'string', description: '現在は空文字で登録します' },
          priority: { type: 'string', enum: ['normal', 'high'] },
          repeatDaily: { type: 'boolean', description: '毎日自動登録する場合はtrue' },
        },
        required: ['title', 'category', 'assignee', 'priority'],
        additionalProperties: false,
      },
      annotations: { readOnlyHint: false, untrustedContentHint: false },
      execute: async (raw: unknown) => {
        const input = raw as Partial<TaskDraft>;
        if (!input.title?.trim() || !input.category?.trim() || !['normal', 'high'].includes(input.priority ?? '')) throw new Error('入力内容が正しくありません');
        const response = await fetch('/api/tasks', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ ...input, workDate }) });
        if (!response.ok) throw new Error('作業を追加できませんでした');
        const { task } = await response.json() as { task: Task };
        setTasks((current) => [...current, task]);
        return { id: task.id, status: task.status, title: task.title };
      },
    });

    register({
      name: 'set_task_status',
      title: '作業の状態を変更',
      description: '作業を未着手・作業中・完了に変更します。完了時はcompletedByに完了者名が必要です。',
      inputSchema: {
        type: 'object',
        properties: {
          id: { type: 'integer', minimum: 1 },
          status: { type: 'string', enum: ['todo', 'doing', 'done'] },
          completedBy: { type: 'string' },
        },
        required: ['id', 'status', 'completedBy'],
        additionalProperties: false,
      },
      annotations: { readOnlyHint: false, untrustedContentHint: false },
      execute: async (raw: unknown) => {
        const input = raw as { id?: number; status?: Status; completedBy?: string };
        if (!Number.isInteger(input.id) || !input.status || !['todo', 'doing', 'done'].includes(input.status) || (input.status === 'done' && !input.completedBy?.trim())) throw new Error('入力内容が正しくありません');
        const response = await fetch('/api/tasks', { method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify(input) });
        if (!response.ok) throw new Error('状態を更新できませんでした');
        const { task } = await response.json() as { task: Task };
        setTasks((current) => current.map((item) => item.id === task.id ? task : item));
        if (task.status === 'done') await loadHistory();
        return { id: task.id, status: task.status, title: task.title };
      },
    });

    register({
      name: 'add_staff_member',
      title: 'スタッフを追加',
      description: '担当者として選べるスタッフ名を追加します。',
      inputSchema: { type: 'object', properties: { name: { type: 'string', minLength: 1, maxLength: 30 } }, required: ['name'], additionalProperties: false },
      annotations: { readOnlyHint: false, untrustedContentHint: false },
      execute: async (raw: unknown) => {
        const name = (raw as { name?: string }).name?.trim();
        if (!name) throw new Error('名前を入力してください');
        const response = await fetch('/api/staff', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ name }) });
        if (!response.ok) throw new Error('スタッフを追加できませんでした');
        const { staffMember } = await response.json() as { staffMember: StaffMember };
        setStaff((current) => [...current, staffMember]);
        return staffMember;
      },
    });

    return () => lifecycle.abort();
  }, [authStatus, loadHistory, workDate]);

  async function signIn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!accessPin.trim()) return;
    setAuthSubmitting(true);
    setAuthError('');
    try {
      const response = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ pin: accessPin }),
      });
      if (!response.ok) throw new Error(await errorMessage(response, 'PINを確認してください'));
      setAccessPin('');
      setAuthStatus('authenticated');
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : 'PINを確認してください');
    } finally {
      setAuthSubmitting(false);
    }
  }

  async function lockBoard() {
    await fetch('/api/auth', { method: 'DELETE' }).catch(() => undefined);
    setAuthStatus('unauthenticated');
    setAccessPin('');
    setAuthError('');
  }

  async function setTaskStatus(task: Task, status: Status, person = '') {
    setSaving(true);
    try {
      const response = await fetch('/api/tasks', { method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ id: task.id, status, completedBy: person }) });
      if (!response.ok) throw new Error(await errorMessage(response, '状態を保存できませんでした'));
      const data = await response.json() as { task: Task };
      setTasks((current) => current.map((item) => item.id === task.id ? data.task : item));
      setNotice(`「${task.title}」を${statusLabel[status]}にしました`);
      if (status === 'done') await loadHistory();
      setCompleteTask(null);
    } catch (error) {
      setNotice(`エラー：${error instanceof Error ? error.message : '状態を保存できませんでした'}`);
    } finally {
      setSaving(false);
    }
  }

  function cycleStatus(task: Task) {
    if (task.status === 'doing') {
      setCompleteTask(task);
      setCompletedBy(task.assignee || staff[0]?.name || '');
      return;
    }
    void setTaskStatus(task, task.status === 'todo' ? 'doing' : 'todo');
  }

  async function addTask() {
    const title = draft.title.trim();
    if (!title) return;
    setSaving(true);
    try {
      const response = await fetch('/api/tasks', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ ...draft, title, workDate }) });
      if (!response.ok) throw new Error(await errorMessage(response, '作業を追加できませんでした'));
      const { task } = await response.json() as { task: Task };
      setTasks((current) => [...current, task]);
      setNotice(`「${title}」を追加しました`);
      setDraft(emptyDraft());
      setAddTaskOpen(false);
    } catch (error) {
      setNotice(`エラー：${error instanceof Error ? error.message : '作業を追加できませんでした'}`);
    } finally {
      setSaving(false);
    }
  }

  function openEdit(task: Task) {
    setEditTask(task);
    setEditDraft({ title: task.title, category: task.category, assignee: task.assignee, dueTime: task.dueTime, priority: task.priority, repeatDaily: task.repeatDaily });
  }

  async function saveEdit() {
    if (!editTask || !editDraft.title.trim()) return;
    setSaving(true);
    try {
      const response = await fetch('/api/tasks', { method: 'PUT', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ id: editTask.id, ...editDraft, title: editDraft.title.trim() }) });
      if (!response.ok) throw new Error(await errorMessage(response, '作業を修正できませんでした'));
      const { task } = await response.json() as { task: Task };
      setTasks((current) => current.map((item) => item.id === task.id ? task : item));
      setNotice(`「${task.title}」を修正しました`);
      setEditTask(null);
    } catch (error) {
      setNotice(`エラー：${error instanceof Error ? error.message : '作業を修正できませんでした'}`);
    } finally {
      setSaving(false);
    }
  }

  async function removeTask() {
    if (!deleteTarget) return;
    const target = deleteTarget;
    setSaving(true);
    try {
      const response = await fetch('/api/tasks', { method: 'DELETE', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ id: target.id }) });
      if (!response.ok) throw new Error(await errorMessage(response, '作業を削除できませんでした'));
      setTasks((current) => current.filter((task) => task.id !== target.id));
      setNotice(`「${target.title}」を削除しました`);
      setDeleteTarget(null);
    } catch (error) {
      setNotice(`エラー：${error instanceof Error ? error.message : '作業を削除できませんでした'}`);
    } finally {
      setSaving(false);
    }
  }

  async function addStaffMember() {
    const name = newStaffName.trim();
    if (!name) return;
    setSaving(true);
    try {
      const response = await fetch('/api/staff', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ name }) });
      if (!response.ok) throw new Error(await errorMessage(response, 'スタッフを追加できませんでした'));
      const { staffMember } = await response.json() as { staffMember: StaffMember };
      setStaff((current) => [...current, staffMember]);
      setNewStaffName('');
      setStaffOpen(false);
      setNotice(`スタッフ「${name}」を追加しました`);
    } catch (error) {
      setNotice(`エラー：${error instanceof Error ? error.message : 'スタッフを追加できませんでした'}`);
    } finally {
      setSaving(false);
    }
  }

  async function removeStaffMember() {
    if (!staffDeleteTarget) return;
    const target = staffDeleteTarget;
    setSaving(true);
    try {
      const response = await fetch('/api/staff', { method: 'DELETE', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ id: target.id }) });
      if (!response.ok) throw new Error(await errorMessage(response, 'スタッフを削除できませんでした'));
      const data = await response.json() as { staffMember: StaffMember; unassignedTaskCount: number };
      setStaff((current) => current.filter((member) => member.id !== target.id));
      setTasks((current) => current.map((task) => task.assignee === target.name && task.status !== 'done' ? { ...task, assignee: '' } : task));
      setDraft((current) => current.assignee === target.name ? { ...current, assignee: '' } : current);
      setEditDraft((current) => current.assignee === target.name ? { ...current, assignee: '' } : current);
      setCompletedBy((current) => current === target.name ? '' : current);
      setStaffDeleteTarget(null);
      setNotice(data.unassignedTaskCount > 0 ? `スタッフ「${target.name}」を削除し、担当中の${data.unassignedTaskCount}件を担当未定にしました` : `スタッフ「${target.name}」を削除しました`);
    } catch (error) {
      setNotice(`エラー：${error instanceof Error ? error.message : 'スタッフを削除できませんでした'}`);
    } finally {
      setSaving(false);
    }
  }

  function openHistory() {
    setHistoryOpen(true);
    void loadHistory().catch(() => setNotice('エラー：完了履歴を読み込めませんでした'));
  }

  if (authStatus === 'checking') {
    return <main className="grid min-h-screen place-items-center bg-[#101827] text-white"><p className="text-sm font-semibold">確認中...</p></main>;
  }

  if (authStatus === 'unauthenticated') {
    return (
      <main className="grid min-h-screen place-items-center bg-[#101827] px-5 py-10 text-white">
        <section className="w-full max-w-sm rounded-3xl bg-white p-7 text-slate-900 shadow-2xl">
          <div className="mb-7 flex items-center gap-3">
            <span className="grid size-12 place-items-center rounded-2xl bg-[#42db9c] text-[#081b16]"><LockKeyhole className="size-6" aria-hidden="true" /></span>
            <div><h1 className="text-xl font-black">作業確認ボード</h1><p className="text-sm text-muted-foreground">店舗用アクセス</p></div>
          </div>
          <form onSubmit={signIn} className="grid gap-4">
            <label htmlFor="access-pin" className="grid gap-2 text-sm font-bold">
              アクセスPIN
              <Input
                id="access-pin"
                type="password"
                inputMode="numeric"
                autoComplete="off"
                autoFocus
                maxLength={4}
                value={accessPin}
                onChange={(event) => setAccessPin(event.target.value.replace(/\D/g, '').slice(0, 4))}
                placeholder="4桁のPIN"
                className="h-14 rounded-xl text-center text-xl tracking-[0.3em]"
              />
            </label>
            {authError ? <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{authError}</p> : null}
            <Button type="submit" className="h-13 rounded-xl bg-[#1269e8] text-base font-bold" disabled={accessPin.length !== 4 || authSubmitting}>
              {authSubmitting ? '確認中...' : 'ボードを開く'}
            </Button>
          </form>
          <p className="mt-5 text-center text-xs leading-relaxed text-muted-foreground">PINが分からない場合は店長に確認してください。</p>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-background text-foreground">
      <header className="border-b border-white/10 bg-[#101827] text-white">
        <div className="mx-auto flex max-w-[1440px] items-center justify-between gap-3 px-4 py-4 sm:px-8 lg:px-12">
          <div className="flex items-center gap-3">
            <span className="grid size-10 place-items-center rounded-xl bg-[#42db9c] text-[#081b16] shadow-[0_0_0_4px_rgba(66,219,156,.12)]"><ChefHat className="size-5" aria-hidden="true" /></span>
            <p className="text-lg font-bold tracking-tight">作業確認ボード</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="mr-2 hidden items-center -space-x-2 lg:flex" aria-label={`本日のスタッフ${staff.length}名`}>
              {staff.slice(0, 6).map((person, index) => <PersonAvatar key={person.id} member={person} index={index} size="sm" />)}
            </div>
            <Button variant="outline" className="h-10 rounded-xl border-white/20 bg-white/5 text-white hover:bg-white/10 hover:text-white" onClick={openHistory}><History /><span className="hidden sm:inline">完了履歴</span></Button>
            <Button variant="outline" className="h-10 rounded-xl border-white/20 bg-white/5 text-white hover:bg-white/10 hover:text-white" onClick={() => void lockBoard()}><LockKeyhole /><span className="hidden sm:inline">ロック</span></Button>
            <Dialog open={addTaskOpen} onOpenChange={setAddTaskOpen}>
              <DialogTrigger render={<Button className="h-10 rounded-xl bg-[#42db9c] px-3 text-[#081b16] hover:bg-[#6ee8b5] sm:px-4" />}><Plus aria-hidden="true" /><span className="hidden sm:inline">新しい作業</span><span className="sm:hidden">追加</span></DialogTrigger>
              <DialogContent className="max-w-md rounded-2xl p-6">
                <DialogHeader><DialogTitle className="text-xl font-bold">作業を追加</DialogTitle><DialogDescription>内容と担当を決めて、今日のリストに追加します。</DialogDescription></DialogHeader>
                <TaskFields prefix="new-task" draft={draft} setDraft={setDraft} staff={staff} />
                <DialogFooter className="-mx-6 -mb-6 px-6"><Button className="h-10 rounded-xl bg-[#1269e8] px-5" onClick={addTask} disabled={!draft.title.trim() || saving}>{saving ? '保存中…' : '追加する'}</Button></DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-[1440px] gap-6 px-4 py-6 sm:px-8 lg:grid-cols-[minmax(0,1fr)_310px] lg:px-12 lg:py-9">
        <section className="min-w-0">
          <div className="mb-6 grid grid-cols-3 gap-2 rounded-2xl bg-slate-200 p-1.5" aria-label="作業カテゴリの切り替え">
            {categoryFilters.map((item) => (
              <Button
                key={item.id}
                size="lg"
                variant={categoryFilter === item.id ? 'default' : 'ghost'}
                onClick={() => setCategoryFilter(item.id)}
                className={`h-14 rounded-xl text-base font-bold ${categoryFilter === item.id ? 'bg-[#1269e8] shadow-sm hover:bg-[#0f5dce]' : 'bg-transparent hover:bg-white/70'}`}
              >
                {item.label}
              </Button>
            ))}
          </div>
          <div className="mb-6 flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
            <div><p className="mb-1 flex items-center gap-2 text-sm font-bold text-[#1269e8]"><Sparkles className="size-4" aria-hidden="true" /> TODAY&apos;S TASKS</p><h1 className="text-3xl font-black tracking-[-0.045em] sm:text-4xl">今日の{categoryFilter === 'all' ? '作業' : categoryFilter}</h1><p className="mt-2 text-base text-muted-foreground">{today} ・ 前日の未完了は自動で繰り越します</p></div>
            <div className="flex flex-wrap items-center gap-2" aria-label="作業の絞り込み">
              {filters.map((item) => <Button key={item.id} size="lg" variant={filter === item.id ? 'default' : 'outline'} onClick={() => setFilter(item.id)} className={filter === item.id ? 'rounded-xl bg-[#1269e8]' : 'rounded-xl'}>{item.label}{item.id === 'unassigned' && unassignedCount > 0 ? <span className="ml-1 grid size-5 place-items-center rounded-full bg-[#ed6a45] text-[11px] text-white">{unassignedCount}</span> : null}</Button>)}
            </div>
          </div>

          <div className="mb-3 grid grid-cols-[auto_1fr_auto] items-center gap-3 px-1 text-xs font-bold uppercase tracking-[0.12em] text-muted-foreground"><span className="w-12">状態</span><span>作業内容</span><span className="hidden sm:block">担当・予定</span></div>
          {notice.startsWith('エラー') ? <div role="alert" className="mb-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{notice}</div> : null}
          <div className="grid gap-3">
            {visibleTasks.map((task) => {
              const personIndex = staff.findIndex((member) => member.name === task.assignee);
              const person = personIndex >= 0 ? staff[personIndex] : undefined;
              return (
                <article key={task.id} className={`task-card group grid grid-cols-[48px_minmax(0,1fr)] gap-3 rounded-2xl border bg-card p-3.5 sm:grid-cols-[48px_minmax(0,1fr)_230px] sm:items-center sm:p-4 ${task.status === 'done' ? 'opacity-60' : ''}`}>
                  <Button variant="ghost" size="icon-lg" onClick={() => cycleStatus(task)} disabled={saving} aria-label={`${task.title}の状態を変更`} className={`size-11 rounded-xl border-2 ${task.status === 'done' ? 'border-[#42db9c] bg-[#42db9c] text-[#0a3a29]' : task.status === 'doing' ? 'border-[#1269e8] bg-[#e6f0ff] text-[#1269e8]' : 'border-slate-200 bg-white text-slate-400'}`}>
                    {task.status === 'done' ? <Check className="size-5" /> : task.status === 'doing' ? <span className="size-2.5 rounded-full bg-current shadow-[0_0_0_5px_rgba(18,105,232,.12)]" /> : <span className="size-2 rounded-full bg-slate-300" />}
                  </Button>
                  <div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><h2 className={`truncate text-base font-bold sm:text-lg ${task.status === 'done' ? 'line-through' : ''}`}>{task.title}</h2>{task.priority === 'high' && task.status !== 'done' ? <span className="inline-flex items-center gap-1 rounded-full bg-[#fff0ea] px-2 py-1 text-xs font-bold text-[#c94724]"><Flame className="size-3" />急ぎ</span> : null}{task.repeatDaily ? <span className="inline-flex items-center gap-1 rounded-full bg-[#eaf2ff] px-2 py-1 text-xs font-bold text-[#145daf]"><Repeat2 className="size-3" />毎日</span> : null}</div><div className="mt-1.5 flex items-center gap-2 text-sm text-muted-foreground"><span className="rounded-md bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600">{task.category}</span><span className="font-medium text-[#1269e8]">{statusLabel[task.status]}</span></div></div>
                  <div className="col-start-2 flex items-center justify-between gap-2 sm:col-start-auto sm:justify-end">
                    {person ? <div className="flex items-center gap-2"><PersonAvatar member={person} index={personIndex} /><span className="text-sm font-bold">{person.name}</span></div> : <span className="inline-flex items-center gap-2 rounded-full border border-dashed border-[#ed6a45] bg-[#fff8f5] px-3 py-1.5 text-sm font-bold text-[#bd3f1f]"><Users className="size-4" />担当未定</span>}
                    <DropdownMenu>
                      <DropdownMenuTrigger render={<Button variant="ghost" size="icon" aria-label={`${task.title}のメニュー`} />}><MoreHorizontal /></DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="min-w-36">
                        <DropdownMenuItem onClick={() => openEdit(task)}><Pencil />修正する</DropdownMenuItem>
                        <DropdownMenuItem variant="destructive" onClick={() => setDeleteTarget(task)}><Trash2 />削除する</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </article>
              );
            })}
          </div>
          {visibleTasks.length === 0 ? <div className="rounded-2xl border border-dashed bg-card py-16 text-center text-muted-foreground">該当する作業はありません</div> : null}
          <output aria-live="polite" className="sr-only">{notice}</output>
        </section>

        <aside className="grid content-start gap-4">
          <section className="overflow-hidden rounded-2xl bg-[#1269e8] p-5 text-white shadow-[0_16px_50px_rgba(18,105,232,.18)]"><div className="mb-7 flex items-start justify-between"><div><p className="text-sm font-semibold text-blue-100">{categoryFilter === 'all' ? '本日' : categoryFilter}の進み具合</p><p className="mt-1 text-4xl font-black tracking-tight">{progress}<span className="text-xl">%</span></p></div><span className="grid size-10 place-items-center rounded-xl bg-white/15"><LayoutList className="size-5" /></span></div><Progress value={progress} className="[&_[data-slot=progress-track]]:h-2 [&_[data-slot=progress-track]]:bg-white/20 [&_[data-slot=progress-indicator]]:bg-[#7cf1bd]" /><div className="mt-3 flex justify-between text-sm font-semibold text-blue-100"><span>{completed}件 完了</span><span>残り{categoryTasks.length - completed}件</span></div></section>

          <section className="rounded-2xl border bg-card p-5"><div className="mb-4 flex items-center justify-between"><h2 className="font-bold">いま確認したいこと</h2>{unassignedCount > 0 ? <AlertTriangle className="size-5 text-[#ed6a45]" /> : <Check className="size-5 text-[#1d9a65]" />}</div>{unassignedCount > 0 ? <div className="rounded-xl bg-[#fff6f0] p-4"><p className="text-sm font-bold text-[#9f351a]">担当未定が{unassignedCount}件あります</p><p className="mt-1 text-sm leading-relaxed text-[#74483a]">担当者が決まっていない作業を確認しましょう。</p><Button variant="ghost" className="mt-2 -ml-2 text-[#b64222] hover:bg-[#ffe8dd]" onClick={() => setFilter('unassigned')}>確認する <ArrowRight /></Button></div> : <p className="rounded-xl bg-[#e9faf2] p-4 text-sm font-semibold text-[#176e4b]">すべての作業に担当者が決まっています。</p>}</section>

          <section className="rounded-2xl border bg-card p-5">
            <div className="mb-4 flex items-center justify-between"><h2 className="font-bold">本日のスタッフ</h2><Button variant="ghost" size="sm" className="text-[#1269e8]" onClick={() => setStaffOpen(true)}><UserPlus />追加</Button></div>
            <div className="grid gap-3">{staff.map((person, index) => { const count = categoryTasks.filter((task) => task.assignee === person.name && task.status !== 'done').length; return <div key={person.id} className="flex items-center gap-3"><PersonAvatar member={person} index={index} /><span className="min-w-0 flex-1 truncate text-sm font-bold">{person.name}</span><span className="text-sm text-muted-foreground">残り{count}件</span><Button variant="ghost" size="icon-sm" className="text-muted-foreground hover:bg-red-50 hover:text-red-600" onClick={() => setStaffDeleteTarget(person)} aria-label={`${person.name}を削除`}><Trash2 /></Button></div>; })}</div>
            {staff.length === 0 ? <p className="rounded-xl bg-slate-50 p-4 text-sm text-muted-foreground">スタッフはまだ登録されていません。</p> : null}
          </section>

          <section className="rounded-2xl border bg-card p-5">
            <div className="mb-3 flex items-center justify-between"><h2 className="font-bold">最近の完了</h2><History className="size-5 text-[#1269e8]" /></div>
            {history.slice(0, 2).map((record) => <div key={record.id} className="border-t py-3 first:border-t-0 first:pt-0"><p className="truncate text-sm font-semibold">{record.taskTitle}</p><p className="mt-1 text-xs text-muted-foreground">{record.completedBy} ・ {formatCompletedAt(record.completedAt)}</p></div>)}
            {history.length === 0 ? <p className="text-sm text-muted-foreground">完了履歴はまだありません</p> : null}
            <Button variant="outline" className="mt-2 w-full rounded-xl" onClick={openHistory}>すべての履歴を見る</Button>
          </section>
        </aside>
      </div>

      <Dialog open={staffOpen} onOpenChange={setStaffOpen}>
        <DialogContent className="max-w-sm rounded-2xl p-6">
          <DialogHeader><DialogTitle className="text-xl font-bold">スタッフを追加</DialogTitle><DialogDescription>作業の担当者や完了者として選べるようになります。</DialogDescription></DialogHeader>
          <label htmlFor="staff-name" className="grid gap-2 py-2 text-sm font-semibold">スタッフ名<Input id="staff-name" value={newStaffName} onChange={(event) => setNewStaffName(event.target.value)} placeholder="例：山田" className="h-11" /></label>
          <DialogFooter className="-mx-6 -mb-6 px-6"><Button className="h-10 rounded-xl bg-[#1269e8] px-5" onClick={addStaffMember} disabled={!newStaffName.trim() || saving}>{saving ? '保存中…' : '追加する'}</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(editTask)} onOpenChange={(open) => { if (!open) setEditTask(null); }}>
        <DialogContent className="max-w-md rounded-2xl p-6">
          <DialogHeader><DialogTitle className="text-xl font-bold">作業を修正</DialogTitle><DialogDescription>作業内容、担当、予定時刻を変更できます。</DialogDescription></DialogHeader>
          <TaskFields prefix="edit-task" draft={editDraft} setDraft={setEditDraft} staff={staff} />
          <DialogFooter className="-mx-6 -mb-6 px-6"><Button className="h-10 rounded-xl bg-[#1269e8] px-5" onClick={saveEdit} disabled={!editDraft.title.trim() || saving}>{saving ? '保存中…' : '変更を保存'}</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(completeTask)} onOpenChange={(open) => { if (!open) setCompleteTask(null); }}>
        <DialogContent className="max-w-sm rounded-2xl p-6">
          <DialogHeader><DialogTitle className="flex items-center gap-2 text-xl font-bold"><UserRoundCheck className="text-[#1d9a65]" />作業を完了</DialogTitle><DialogDescription>「{completeTask?.title}」を完了した人を選んでください。</DialogDescription></DialogHeader>
          <label htmlFor="completed-by" className="grid gap-2 py-2 text-sm font-semibold">完了者
            <Select value={completedBy} onValueChange={(value) => setCompletedBy(value ?? '')}>
              <SelectTrigger id="completed-by" className="h-11 w-full"><SelectValue placeholder="完了者を選ぶ" /></SelectTrigger>
              <SelectContent>{staff.map((person) => <SelectItem key={person.id} value={person.name}>{person.name}</SelectItem>)}</SelectContent>
            </Select>
          </label>
          <DialogFooter className="-mx-6 -mb-6 px-6"><Button className="h-10 rounded-xl bg-[#1d9a65] px-5 hover:bg-[#168257]" onClick={() => completeTask && void setTaskStatus(completeTask, 'done', completedBy)} disabled={!completedBy || saving}>{saving ? '保存中…' : '完了にする'}</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={Boolean(deleteTarget)} onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogMedia className="bg-red-50 text-red-600"><Trash2 /></AlertDialogMedia><AlertDialogTitle>この作業を削除しますか？</AlertDialogTitle><AlertDialogDescription>「{deleteTarget?.title}」を一覧から削除します。{deleteTarget?.repeatDaily ? '毎日の自動登録も停止します。' : ''}過去の完了履歴は残ります。</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel disabled={saving}>キャンセル</AlertDialogCancel><AlertDialogAction variant="destructive" onClick={removeTask} disabled={saving}>{saving ? '削除中…' : '削除する'}</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={Boolean(staffDeleteTarget)} onOpenChange={(open) => { if (!open) setStaffDeleteTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogMedia className="bg-red-50 text-red-600"><Trash2 /></AlertDialogMedia><AlertDialogTitle>このスタッフを削除しますか？</AlertDialogTitle><AlertDialogDescription>「{staffDeleteTarget?.name}」をスタッフ一覧から削除します。担当中の作業は「担当未定」に戻り、過去の完了履歴には名前が残ります。</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel disabled={saving}>キャンセル</AlertDialogCancel><AlertDialogAction variant="destructive" onClick={removeStaffMember} disabled={saving}>{saving ? '削除中…' : '削除する'}</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Sheet open={historyOpen} onOpenChange={setHistoryOpen}>
        <SheetContent className="w-full sm:max-w-md">
          <SheetHeader className="border-b p-6"><SheetTitle className="flex items-center gap-2 text-xl font-bold"><History className="text-[#1269e8]" />完了履歴</SheetTitle><SheetDescription>誰が、どの作業を、いつ完了したかを確認できます。</SheetDescription></SheetHeader>
          <div className="flex-1 overflow-y-auto px-6 pb-8">
            {history.map((record) => <article key={record.id} className="relative border-b py-5 pl-11"><span className="absolute left-0 top-5 grid size-8 place-items-center rounded-full bg-[#e9faf2] text-[#1d9a65]"><Check className="size-4" /></span><h3 className="font-bold">{record.taskTitle}</h3><p className="mt-1 text-sm text-muted-foreground"><strong className="text-foreground">{record.completedBy}</strong> が完了</p><time className="mt-1 block text-xs text-muted-foreground">{formatCompletedAt(record.completedAt)}</time></article>)}
            {history.length === 0 ? <div className="py-20 text-center text-muted-foreground"><History className="mx-auto mb-3 size-8 opacity-40" /><p>完了履歴はまだありません</p></div> : null}
          </div>
        </SheetContent>
      </Sheet>
    </main>
  );
}
