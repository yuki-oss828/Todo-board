UPDATE `tasks`
SET `assignee` = ''
WHERE `assignee` IN ('田中', '佐藤', '鈴木', '高橋');
--> statement-breakpoint
UPDATE `task_templates`
SET `assignee` = ''
WHERE `assignee` IN ('田中', '佐藤', '鈴木', '高橋');
--> statement-breakpoint
DELETE FROM `staff_members`
WHERE `name` IN ('田中', '佐藤', '鈴木', '高橋');
