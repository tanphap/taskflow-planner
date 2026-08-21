ALTER TABLE `email_accounts` ADD `lastSyncFetchedCount` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `email_accounts` ADD `lastSyncNewCount` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `email_accounts` ADD `mailboxMessageCount` int DEFAULT 0 NOT NULL;