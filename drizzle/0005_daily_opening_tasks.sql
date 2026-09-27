DELETE FROM `tasks`
WHERE `title` IN (
	'玉ねぎをスライスする',
	'鶏もも肉を20食分カット',
	'ランチ用ソースを仕込む',
	'サラダを12皿盛り付け',
	'米を4升炊く',
	'冷蔵庫の温度を記録'
);
--> statement-breakpoint
INSERT OR IGNORE INTO `task_templates` (`id`, `title`, `category`, `assignee`, `due_time`, `priority`, `active`) VALUES
	('opening-counter', 'カウンターを拭く', '開店前', '', '', 'normal', 1),
	('opening-beer', 'ビールの調整をする', '開店前', '', '', 'normal', 1),
	('opening-slips', '伝票を確認する', '開店前', '', '', 'normal', 1),
	('opening-rooms', '部屋をセットする', '開店前', '', '', 'normal', 1),
	('opening-ice', '氷を用意する', '開店前', '', '', 'normal', 1),
	('opening-course', 'コース料理を確認する', '開店前', '', '', 'normal', 1),
	('opening-toilet-1f', '1階トイレを確認する', '開店前', '', '', 'normal', 1),
	('opening-towels-2f', '2階のおしぼりウォーマーの電源を入れる', '開店前', '', '', 'normal', 1),
	('opening-ac-2f', '2階のエアコンをつける', '開店前', '', '', 'normal', 1),
	('opening-toilet-2f', '2階トイレを確認する', '開店前', '', '', 'normal', 1);
--> statement-breakpoint
INSERT OR IGNORE INTO `tasks` (`title`, `category`, `assignee`, `due_time`, `status`, `priority`, `work_date`, `template_id`)
SELECT `title`, `category`, `assignee`, `due_time`, 'todo', `priority`, (SELECT MAX(`work_date`) FROM `board_days`), `id`
FROM `task_templates`
WHERE `id` LIKE 'opening-%'
	AND (SELECT MAX(`work_date`) FROM `board_days`) IS NOT NULL;
