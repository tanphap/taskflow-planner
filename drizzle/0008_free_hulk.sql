CREATE TABLE `email_gemini_summaries` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`emailAccountId` int NOT NULL,
	`emailMessageId` int NOT NULL,
	`summary` text NOT NULL,
	`locale` varchar(12) NOT NULL DEFAULT 'vi',
	`model` varchar(120) NOT NULL,
	`status` enum('ready','error') NOT NULL DEFAULT 'ready',
	`errorMessage` varchar(1000),
	`consentedAt` timestamp NOT NULL DEFAULT (now()),
	`generatedAt` timestamp NOT NULL DEFAULT (now()),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `email_gemini_summaries_id` PRIMARY KEY(`id`),
	CONSTRAINT `email_gemini_summaries_message_uq` UNIQUE(`emailMessageId`)
);
--> statement-breakpoint
CREATE INDEX `email_gemini_summaries_user_generated_idx` ON `email_gemini_summaries` (`userId`,`generatedAt`);--> statement-breakpoint
CREATE INDEX `email_gemini_summaries_account_idx` ON `email_gemini_summaries` (`emailAccountId`);