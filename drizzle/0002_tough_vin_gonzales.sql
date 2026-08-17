CREATE TABLE `telegram_connections` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`chatId` varchar(64),
	`linkToken` varchar(96),
	`linkTokenExpiresAt` timestamp,
	`connectedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `telegram_connections_id` PRIMARY KEY(`id`),
	CONSTRAINT `telegram_connections_user_uq` UNIQUE(`userId`),
	CONSTRAINT `telegram_connections_link_token_uq` UNIQUE(`linkToken`)
);
--> statement-breakpoint
ALTER TABLE `calendar_events` ADD `telegramReminder` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `calendar_events` ADD `telegramJobUid` varchar(65);--> statement-breakpoint
ALTER TABLE `calendar_events` ADD `telegramSentAt` timestamp;--> statement-breakpoint
ALTER TABLE `calendar_events` ADD `telegramDeliveryError` text;--> statement-breakpoint
CREATE INDEX `events_telegram_job_idx` ON `calendar_events` (`telegramJobUid`);