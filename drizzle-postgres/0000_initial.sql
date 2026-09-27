CREATE TABLE IF NOT EXISTS "task_templates" (
  "id" text PRIMARY KEY NOT NULL,
  "title" text NOT NULL,
  "category" text DEFAULT '開店前' NOT NULL,
  "assignee" text DEFAULT '' NOT NULL,
  "due_time" text DEFAULT '' NOT NULL,
  "priority" text DEFAULT 'normal' NOT NULL,
  "active" boolean DEFAULT true NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "tasks" (
  "id" serial PRIMARY KEY NOT NULL,
  "title" text NOT NULL,
  "category" text DEFAULT '開店前' NOT NULL,
  "assignee" text DEFAULT '' NOT NULL,
  "due_time" text DEFAULT '' NOT NULL,
  "status" text DEFAULT 'todo' NOT NULL,
  "priority" text DEFAULT 'normal' NOT NULL,
  "work_date" text NOT NULL,
  "template_id" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "board_days" (
  "work_date" text PRIMARY KEY NOT NULL,
  "initialized_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "staff_members" (
  "id" serial PRIMARY KEY NOT NULL,
  "name" text NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "completion_history" (
  "id" serial PRIMARY KEY NOT NULL,
  "task_id" integer,
  "task_title" text NOT NULL,
  "completed_by" text NOT NULL,
  "completed_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "idx_tasks_work_date_status" ON "tasks" ("work_date", "status");
CREATE UNIQUE INDEX IF NOT EXISTS "idx_tasks_work_date_template" ON "tasks" ("work_date", "template_id") WHERE "template_id" IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS "idx_staff_members_name" ON "staff_members" ("name");
CREATE INDEX IF NOT EXISTS "idx_completion_history_completed_at" ON "completion_history" ("completed_at");
CREATE UNIQUE INDEX IF NOT EXISTS "idx_completion_history_task" ON "completion_history" ("task_id") WHERE "task_id" IS NOT NULL;
