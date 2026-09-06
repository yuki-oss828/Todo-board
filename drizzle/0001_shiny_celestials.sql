CREATE TABLE `completion_history` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`task_id` integer,
	`task_title` text NOT NULL,
	`completed_by` text NOT NULL,
	`completed_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_completion_history_completed_at` ON `completion_history` (`completed_at`);--> statement-breakpoint
CREATE TABLE `staff_members` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_staff_members_name` ON `staff_members` (`name`);--> statement-breakpoint
PRAGMA optimize;
