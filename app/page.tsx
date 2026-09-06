'use client';

import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, ArrowRight, Check, ChefHat, Clock3, Flame, LayoutList, Plus, Sparkles, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';

type Status = 'todo' | 'doing' | 'done';
type Priority = 'normal' | 'high';
type Task = { id: number; title: string; category: string; assignee: string; dueTime: string; status: Status; priority: Priority };

const staff = [
  { name: '田中', initials: '田', tone: 'bg-[#dcecff] text-[#16579d]' },
  { name: '佐藤', initials: '佐', tone: 'bg-[#efe4ff] text-[#7040aa]' },
  { name: '鈴木', initials: '鈴', tone: 'bg-[#dff6e8] text-[#187147]' },
  { name: '高橋', initials: '高', tone: 'bg-[#ffe6d8] text-[#a94816]' },
];

const initialTasks: Task[] = [
  { id: 1, title: '玉ねぎをスライスする', category: '野菜', assignee: '田中', dueTime: '10:30', status: 'doing', priority: 'high' },
  { id: 2, title: '鶏もも肉を20食分カット', category: '肉・魚', assignee: '佐藤', dueTime: '11:00', status: 'todo', priority: 'normal' },
  { id: 3, title: 'ランチ用ソースを仕込む', category: 'ソース', assignee: '鈴木', dueTime: '11:15', status: 'todo', priority: 'normal' },
  { id: 4, title: 'サラダを12皿盛り付け', category: '盛り付け', assignee: '', dueTime: '11:30', status: 'todo', priority: 'high' },
  { id: 5, title: '米を4升炊く', category: '炊飯', assignee: '高橋', dueTime: '10:00', status: 'done', priority: 'normal' },
  { id: 6, title: '冷蔵庫の温度を記録', category: '確認', assignee: '田中', dueTime: '09:30', status: 'done', priority: 'normal' },
];

const filters = [
  { id: 'all', label: 'すべて' },
  { id: 'open', label: '未完了' },
  { id: 'unassigned', label: '担当未定' },
  { id: 'done', label: '完了' },
] as const;

const statusLabel: Record<Status, string> = { todo: '未着手', doing: '作業中', done: '完了' };

export default function Home() {
  const [tasks, setTasks] = useState(initialTasks);
  const [filter, setFilter] = useState<(typeof filters)[number]['id']>('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [notice, setNotice] = useState('');
  const [saving, setSaving] = useState(false);
  const [draft, setDraft] = useState({ title: '', category: '仕込み', assignee: '', dueTime: '11:30', priority: 'normal' as Priority });

  const today = new Intl.DateTimeFormat('ja-JP', { month: 'long', day: 'numeric', weekday: 'short', timeZone: 'Asia/Tokyo' }).format(new Date());
  const completed = tasks.filter((task) => task.status === 'done').length;
  const progress = tasks.length ? Math.round((completed / tasks.length) * 100) : 0;
  const visibleTasks = useMemo(() => {
    if (filter === 'open') return tasks.filter((task) => task.status !== 'done');
    if (filter === 'unassigned') return tasks.filter((task) => !task.assignee);
    if (filter === 'done') return tasks.filter((task) => task.status === 'done');
    return tasks;
  }, [filter, tasks]);

  useEffect(() => {
    let active = true;
    fetch('/api/tasks')
      .then(async (response) => {
        if (!response.ok) throw new Error('load failed');
        return response.json() as Promise<{ tasks: Task[] }>;
      })
      .then((data) => { if (active) setTasks(data.tasks); })
      .catch(() => { if (active) setNotice('エラー：保存済みの作業を読み込めませんでした'); });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    type WebMcpContext = {
      registerTool: (tool: Record<string, unknown>, options?: { signal?: AbortSignal }) => void | Promise<void>;
    };
    const context = (document as unknown as { modelContext?: WebMcpContext }).modelContext;
    if (!context?.registerTool) return;
    const lifecycle = new AbortController();

    const register = (tool: Record<string, unknown>) => {
      void Promise.resolve(context.registerTool(tool, { signal: lifecycle.signal })).catch(() => undefined);
    };

    register({
      name: 'create_prep_task',
      title: '仕込み作業を追加',
      description: '今日の仕込み作業を1件追加し、画面の一覧にも反映します。',
      inputSchema: {
        type: 'object',
        properties: {
          title: { type: 'string', minLength: 1, maxLength: 100 },
          category: { type: 'string', minLength: 1, maxLength: 30 },
          assignee: { type: 'string' },
          dueTime: { type: 'string', pattern: '^\\d{2}:\\d{2}$' },
          priority: { type: 'string', enum: ['normal', 'high'] },
        },
        required: ['title', 'category', 'assignee', 'dueTime', 'priority'],
        additionalProperties: false,
      },
      annotations: { readOnlyHint: false, untrustedContentHint: false },
      execute: async (raw: unknown) => {
        const input = raw as Partial<Omit<Task, 'id' | 'status'>>;
        if (!input.title?.trim() || !input.category?.trim() || !/^\d{2}:\d{2}$/.test(input.dueTime ?? '') || !['normal', 'high'].includes(input.priority ?? '')) throw new Error('入力内容が正しくありません');
        const response = await fetch('/api/tasks', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(input) });
        if (!response.ok) throw new Error('作業を追加できませんでした');
        const { task } = await response.json() as { task: Task };
        setTasks((current) => [...current, task]);
        setNotice(`「${task.title}」を追加しました`);
        return { id: task.id, status: task.status, title: task.title };
      },
    });

    register({
      name: 'set_prep_task_status',
      title: '仕込み作業の状態を変更',
      description: '指定した仕込み作業を未着手・作業中・完了のいずれかに変更し、画面にも反映します。',
      inputSchema: {
        type: 'object',
        properties: { id: { type: 'integer', minimum: 1 }, status: { type: 'string', enum: ['todo', 'doing', 'done'] } },
        required: ['id', 'status'],
        additionalProperties: false,
      },
      annotations: { readOnlyHint: false, untrustedContentHint: false },
      execute: async (raw: unknown) => {
        const input = raw as { id?: number; status?: Status };
        if (!Number.isInteger(input.id) || !input.status || !['todo', 'doing', 'done'].includes(input.status)) throw new Error('入力内容が正しくありません');
        const response = await fetch('/api/tasks', { method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify(input) });
        if (!response.ok) throw new Error('状態を更新できませんでした');
        const { task } = await response.json() as { task: Task };
        setTasks((current) => current.map((item) => item.id === task.id ? task : item));
        setNotice(`「${task.title}」を${statusLabel[task.status]}にしました`);
        return { id: task.id, status: task.status, title: task.title };
      },
    });

    return () => lifecycle.abort();
  }, []);

  async function cycleStatus(id: number) {
    const previous = tasks.find((task) => task.id === id);
    if (!previous) return;
    const status: Status = previous.status === 'todo' ? 'doing' : previous.status === 'doing' ? 'done' : 'todo';
    setTasks((current) => current.map((task) => task.id === id ? { ...task, status } : task));
    setNotice(`「${previous.title}」を${statusLabel[status]}にしました`);
    try {
      const response = await fetch('/api/tasks', { method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ id, status }) });
      if (!response.ok) throw new Error('update failed');
    } catch {
      setTasks((current) => current.map((task) => task.id === id ? previous : task));
      setNotice('エラー：状態を保存できませんでした');
    }
  }

  async function addTask() {
    const title = draft.title.trim();
    if (!title) return;
    setSaving(true);
    try {
      const response = await fetch('/api/tasks', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ ...draft, title }) });
      if (!response.ok) throw new Error('create failed');
      const { task } = await response.json() as { task: Task };
      setTasks((current) => [...current, task]);
      setNotice(`「${title}」を追加しました`);
      setDraft({ title: '', category: '仕込み', assignee: '', dueTime: '11:30', priority: 'normal' });
      setDialogOpen(false);
    } catch {
      setNotice('エラー：作業を追加できませんでした');
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="min-h-screen bg-background text-foreground">
      <header className="border-b border-white/10 bg-[#101827] text-white">
        <div className="mx-auto flex max-w-[1440px] items-center justify-between gap-4 px-4 py-4 sm:px-8 lg:px-12">
          <div className="flex items-center gap-3">
            <span className="grid size-10 place-items-center rounded-xl bg-[#42db9c] text-[#081b16] shadow-[0_0_0_4px_rgba(66,219,156,.12)]"><ChefHat className="size-5" aria-hidden="true" /></span>
            <div><p className="text-lg font-bold tracking-tight">仕込みボード</p><p className="text-xs text-slate-400">駅前店</p></div>
          </div>
          <div className="flex items-center gap-2 sm:gap-4">
            <div className="hidden items-center -space-x-2 sm:flex" aria-label="本日のスタッフ4名">
              {staff.map((person) => <span key={person.name} title={person.name} className={`grid size-8 place-items-center rounded-full border-2 border-[#101827] text-xs font-bold ${person.tone}`}>{person.initials}</span>)}
            </div>
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger render={<Button className="h-10 rounded-xl bg-[#42db9c] px-4 text-[#081b16] hover:bg-[#6ee8b5]" />}><Plus aria-hidden="true" /> 新しい作業</DialogTrigger>
              <DialogContent className="max-w-md rounded-2xl p-6">
                <DialogHeader><DialogTitle className="text-xl font-bold">作業を追加</DialogTitle><DialogDescription>内容と担当を決めて、今日のリストに追加します。</DialogDescription></DialogHeader>
                <div className="grid gap-4 py-2">
                  <label htmlFor="task-title" className="grid gap-2 text-sm font-semibold">作業内容<Input id="task-title" value={draft.title} onChange={(event) => setDraft({ ...draft, title: event.target.value })} placeholder="例：キャベツを千切りにする" className="h-11" /></label>
                  <div className="grid grid-cols-2 gap-3">
                    <label htmlFor="task-category" className="grid gap-2 text-sm font-semibold">カテゴリ<Input id="task-category" value={draft.category} onChange={(event) => setDraft({ ...draft, category: event.target.value })} className="h-11" /></label>
                    <label htmlFor="task-time" className="grid gap-2 text-sm font-semibold">完了予定<Input id="task-time" type="time" value={draft.dueTime} onChange={(event) => setDraft({ ...draft, dueTime: event.target.value })} className="h-11" /></label>
                  </div>
                  <label htmlFor="task-assignee" className="grid gap-2 text-sm font-semibold">担当者
                    <Select value={draft.assignee} onValueChange={(value) => setDraft({ ...draft, assignee: value ?? '' })}>
                      <SelectTrigger id="task-assignee" className="h-11 w-full"><SelectValue placeholder="あとで決める" /></SelectTrigger>
                      <SelectContent><SelectItem value="">あとで決める</SelectItem>{staff.map((person) => <SelectItem key={person.name} value={person.name}>{person.name}</SelectItem>)}</SelectContent>
                    </Select>
                  </label>
                  <label className="flex cursor-pointer items-center gap-3 rounded-xl border bg-slate-50 p-3 text-sm font-semibold"><input type="checkbox" checked={draft.priority === 'high'} onChange={(event) => setDraft({ ...draft, priority: event.target.checked ? 'high' : 'normal' })} className="size-4 accent-[#ed6a45]" /><Flame className="size-4 text-[#df5631]" aria-hidden="true" /> 急ぎの作業にする</label>
                </div>
                <DialogFooter className="-mx-6 -mb-6 px-6"><Button className="h-10 rounded-xl bg-[#1269e8] px-5" onClick={addTask} disabled={!draft.title.trim() || saving}>{saving ? '保存中…' : '追加する'}</Button></DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-[1440px] gap-6 px-4 py-6 sm:px-8 lg:grid-cols-[minmax(0,1fr)_310px] lg:px-12 lg:py-9">
        <section className="min-w-0">
          <div className="mb-6 flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
            <div><p className="mb-1 flex items-center gap-2 text-sm font-bold text-[#1269e8]"><Sparkles className="size-4" aria-hidden="true" /> TODAY&apos;S PREP</p><h1 className="text-3xl font-black tracking-[-0.045em] sm:text-4xl">今日の仕込み</h1><p className="mt-2 text-base text-muted-foreground">{today} ・ ランチ営業まであと3時間</p></div>
            <div className="flex flex-wrap gap-2" aria-label="作業の絞り込み">
              {filters.map((item) => <Button key={item.id} size="lg" variant={filter === item.id ? 'default' : 'outline'} onClick={() => setFilter(item.id)} className={filter === item.id ? 'rounded-xl bg-[#1269e8]' : 'rounded-xl'}>{item.label}{item.id === 'unassigned' && tasks.some((task) => !task.assignee) ? <span className="ml-1 grid size-5 place-items-center rounded-full bg-[#ed6a45] text-[11px] text-white">{tasks.filter((task) => !task.assignee).length}</span> : null}</Button>)}
            </div>
          </div>

          <div className="mb-3 grid grid-cols-[auto_1fr_auto] items-center gap-3 px-1 text-xs font-bold uppercase tracking-[0.12em] text-muted-foreground"><span className="w-12">状態</span><span>作業内容</span><span className="hidden sm:block">担当・予定</span></div>
          {notice.startsWith('エラー') ? <div role="alert" className="mb-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{notice}</div> : null}
          <div className="grid gap-3">
            {visibleTasks.map((task) => {
              const person = staff.find((member) => member.name === task.assignee);
              return (
                <article key={task.id} className={`task-card group grid grid-cols-[48px_minmax(0,1fr)] gap-3 rounded-2xl border bg-card p-3.5 sm:grid-cols-[48px_minmax(0,1fr)_190px] sm:items-center sm:p-4 ${task.status === 'done' ? 'opacity-60' : ''}`}>
                  <Button variant="ghost" size="icon-lg" onClick={() => cycleStatus(task.id)} aria-label={`${task.title}の状態を変更`} className={`size-11 rounded-xl border-2 ${task.status === 'done' ? 'border-[#42db9c] bg-[#42db9c] text-[#0a3a29]' : task.status === 'doing' ? 'border-[#1269e8] bg-[#e6f0ff] text-[#1269e8]' : 'border-slate-200 bg-white text-slate-400'}`}>
                    {task.status === 'done' ? <Check className="size-5" /> : task.status === 'doing' ? <span className="size-2.5 rounded-full bg-current shadow-[0_0_0_5px_rgba(18,105,232,.12)]" /> : <span className="size-2 rounded-full bg-slate-300" />}
                  </Button>
                  <div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><h2 className={`truncate text-base font-bold sm:text-lg ${task.status === 'done' ? 'line-through' : ''}`}>{task.title}</h2>{task.priority === 'high' && task.status !== 'done' ? <span className="inline-flex items-center gap-1 rounded-full bg-[#fff0ea] px-2 py-1 text-xs font-bold text-[#c94724]"><Flame className="size-3" />急ぎ</span> : null}</div><div className="mt-1.5 flex items-center gap-2 text-sm text-muted-foreground"><span className="rounded-md bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600">{task.category}</span><span className="font-medium text-[#1269e8]">{statusLabel[task.status]}</span></div></div>
                  <div className="col-start-2 flex items-center justify-between gap-3 sm:col-start-auto sm:justify-end">
                    {person ? <div className="flex items-center gap-2"><span className={`grid size-9 place-items-center rounded-full text-xs font-bold ${person.tone}`}>{person.initials}</span><span className="text-sm font-bold">{person.name}</span></div> : <span className="inline-flex items-center gap-2 rounded-full border border-dashed border-[#ed6a45] bg-[#fff8f5] px-3 py-1.5 text-sm font-bold text-[#bd3f1f]"><Users className="size-4" />担当未定</span>}
                    <span className="flex items-center gap-1.5 text-sm font-semibold tabular-nums text-muted-foreground"><Clock3 className="size-4" />{task.dueTime}</span>
                  </div>
                </article>
              );
            })}
          </div>
          {visibleTasks.length === 0 ? <div className="rounded-2xl border border-dashed bg-card py-16 text-center text-muted-foreground">該当する作業はありません</div> : null}
          <output aria-live="polite" className="sr-only">{notice}</output>
        </section>

        <aside className="grid content-start gap-4">
          <section className="overflow-hidden rounded-2xl bg-[#1269e8] p-5 text-white shadow-[0_16px_50px_rgba(18,105,232,.18)]"><div className="mb-7 flex items-start justify-between"><div><p className="text-sm font-semibold text-blue-100">本日の進み具合</p><p className="mt-1 text-4xl font-black tracking-tight">{progress}<span className="text-xl">%</span></p></div><span className="grid size-10 place-items-center rounded-xl bg-white/15"><LayoutList className="size-5" /></span></div><Progress value={progress} className="[&_[data-slot=progress-track]]:h-2 [&_[data-slot=progress-track]]:bg-white/20 [&_[data-slot=progress-indicator]]:bg-[#7cf1bd]" /><div className="mt-3 flex justify-between text-sm font-semibold text-blue-100"><span>{completed}件 完了</span><span>残り{tasks.length - completed}件</span></div></section>
          <section className="rounded-2xl border bg-card p-5"><div className="mb-4 flex items-center justify-between"><h2 className="font-bold">いま確認したいこと</h2><AlertTriangle className="size-5 text-[#ed6a45]" /></div><div className="rounded-xl bg-[#fff6f0] p-4"><p className="text-sm font-bold text-[#9f351a]">担当未定の作業があります</p><p className="mt-1 text-sm leading-relaxed text-[#74483a]">担当者が決まっていない作業を確認しましょう。</p><Button variant="ghost" className="mt-2 -ml-2 text-[#b64222] hover:bg-[#ffe8dd]" onClick={() => setFilter('unassigned')}>確認する <ArrowRight /></Button></div></section>
          <section className="rounded-2xl border bg-card p-5"><h2 className="mb-4 font-bold">本日のスタッフ</h2><div className="grid gap-3">{staff.map((person) => { const count = tasks.filter((task) => task.assignee === person.name && task.status !== 'done').length; return <div key={person.name} className="flex items-center gap-3"><span className={`grid size-9 place-items-center rounded-full text-xs font-bold ${person.tone}`}>{person.initials}</span><span className="flex-1 text-sm font-bold">{person.name}</span><span className="text-sm text-muted-foreground">残り{count}件</span></div>; })}</div></section>
        </aside>
      </div>
    </main>
  );
}
