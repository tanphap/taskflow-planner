CREATE TABLE `calendar_events` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`title` varchar(240) NOT NULL,
	`description` text,
	`startAt` timestamp NOT NULL,
	`endAt` timestamp NOT NULL,
	`reminderAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `calendar_events_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `notifications` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`sourceKey` varchar(96) NOT NULL,
	`kind` enum('task','event') NOT NULL,
	`title` varchar(240) NOT NULL,
	`body` text,
	`scheduledFor` timestamp NOT NULL,
	`readAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `notifications_id` PRIMARY KEY(`id`),
	CONSTRAINT `notifications_source_uq` UNIQUE(`sourceKey`)
);
--> statement-breakpoint
CREATE TABLE `tasks` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`title` varchar(240) NOT NULL,
	`description` text,
	`status` enum('todo','in_progress','done') NOT NULL DEFAULT 'todo',
	`priority` enum('low','medium','high') NOT NULL DEFAULT 'medium',
	`dueAt` timestamp,
	`reminderAt` timestamp,
	`completedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `tasks_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `events_user_start_idx` ON `calendar_events` (`userId`,`startAt`);--> statement-breakpoint
CREATE INDEX `events_user_reminder_idx` ON `calendar_events` (`userId`,`reminderAt`);--> statement-breakpoint
CREATE INDEX `notifications_user_read_idx` ON `notifications` (`userId`,`readAt`);--> statement-breakpoint
CREATE INDEX `tasks_user_status_idx` ON `tasks` (`userId`,`status`);--> statement-breakpoint
CREATE INDEX `tasks_user_due_idx` ON `tasks` (`userId`,`dueAt`);--> statement-breakpoint
CREATE INDEX `tasks_user_reminder_idx` ON `tasks` (`userId`,`reminderAt`);