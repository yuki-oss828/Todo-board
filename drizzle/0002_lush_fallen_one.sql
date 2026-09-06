CREATE TABLE `board_days` (
	`work_date` text PRIMARY KEY NOT NULL,
	`initialized_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
ALTER TABLE `tasks` ADD `work_date` text DEFAULT '1970-01-01' NOT NULL;--> statement-breakpoint
CREATE INDEX `idx_tasks_work_date_status` ON `tasks` (`work_date`,`status`);--> statement-breakpoint
PRAGMA optimize;
