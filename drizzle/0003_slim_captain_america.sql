CREATE TABLE `task_templates` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`category` text DEFAULT '仕込み' NOT NULL,
	`assignee` text DEFAULT '' NOT NULL,
	`due_time` text NOT NULL,
	`priority` text DEFAULT 'normal' NOT NULL,
	`active` integer DEFAULT true NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
ALTER TABLE `tasks` ADD `template_id` text;--> statement-breakpoint
CREATE UNIQUE INDEX `idx_tasks_work_date_template` ON `tasks` (`work_date`,`template_id`) WHERE "tasks"."template_id" IS NOT NULL;--> statement-breakpoint
PRAGMA optimize;
