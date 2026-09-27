UPDATE `tasks`
SET `category` = CASE
	WHEN `category` = '確認' THEN '締め'
	ELSE '仕込み'
END
WHERE `category` IN ('野菜', '肉・魚', 'ソース', '盛り付け', '炊飯', '確認');
--> statement-breakpoint
UPDATE `task_templates`
SET `category` = CASE
	WHEN `category` = '確認' THEN '締め'
	ELSE '仕込み'
END
WHERE `category` IN ('野菜', '肉・魚', 'ソース', '盛り付け', '炊飯', '確認');
