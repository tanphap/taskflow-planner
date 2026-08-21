CREATE TABLE `email_notes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`emailAccountId` int,
	`emailMessageId` int,
	`title` varchar(240) NOT NULL,
	`body` text,
	`isPinned` boolean NOT NULL DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `email_notes_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `email_notes_user_updated_idx` ON `email_notes` (`userId`,`updatedAt`);--> statement-breakpoint
CREATE INDEX `email_notes_user_pinned_idx` ON `email_notes` (`userId`,`isPinned`);--> statement-breakpoint
CREATE INDEX `email_notes_message_idx` ON `email_notes` (`emailMessageId`);--> statement-breakpoint
CREATE INDEX `email_notes_account_idx` ON `email_notes` (`emailAccountId`);