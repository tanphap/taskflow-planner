CREATE TABLE `email_event_suggestions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`emailAccountId` int NOT NULL,
	`emailMessageId` int NOT NULL,
	`title` varchar(240) NOT NULL,
	`description` text,
	`startAt` timestamp NOT NULL,
	`endAt` timestamp NOT NULL,
	`reminderMinutes` int NOT NULL DEFAULT 15,
	`planLink` varchar(1000),
	`sourceExcerpt` varchar(1000),
	`confidence` int NOT NULL,
	`model` varchar(80) NOT NULL,
	`status` enum('pending','accepted','dismissed','error') NOT NULL DEFAULT 'pending',
	`calendarEventId` int,
	`errorMessage` varchar(1000),
	`analyzedAt` timestamp NOT NULL DEFAULT (now()),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `email_event_suggestions_id` PRIMARY KEY(`id`),
	CONSTRAINT `email_event_suggestions_message_uq` UNIQUE(`emailMessageId`)
);
--> statement-breakpoint
ALTER TABLE `email_accounts` ADD `aiSyncEnabled` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `email_accounts` ADD `aiSyncIntervalMinutes` int DEFAULT 60 NOT NULL;--> statement-breakpoint
ALTER TABLE `email_accounts` ADD `aiSyncJobUid` varchar(65);--> statement-breakpoint
ALTER TABLE `email_accounts` ADD `aiSyncLastRunAt` timestamp;--> statement-breakpoint
ALTER TABLE `email_accounts` ADD `aiSyncLastError` text;--> statement-breakpoint
CREATE INDEX `email_event_suggestions_user_status_idx` ON `email_event_suggestions` (`userId`,`status`);--> statement-breakpoint
CREATE INDEX `email_event_suggestions_account_status_idx` ON `email_event_suggestions` (`emailAccountId`,`status`);--> statement-breakpoint
CREATE INDEX `email_accounts_ai_sync_job_idx` ON `email_accounts` (`aiSyncJobUid`);