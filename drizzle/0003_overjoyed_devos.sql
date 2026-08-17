CREATE TABLE `telegram_delivery_logs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`eventId` int NOT NULL,
	`eventTitle` varchar(240) NOT NULL,
	`sentAt` timestamp NOT NULL DEFAULT (now()),
	`status` enum('success','error') NOT NULL,
	`errorMessage` varchar(500),
	CONSTRAINT `telegram_delivery_logs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `calendar_events` ADD `recurrenceRule` varchar(500);--> statement-breakpoint
CREATE INDEX `telegram_delivery_logs_user_sent_idx` ON `telegram_delivery_logs` (`userId`,`sentAt`);--> statement-breakpoint
CREATE INDEX `telegram_delivery_logs_event_idx` ON `telegram_delivery_logs` (`eventId`);