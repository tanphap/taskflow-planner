ALTER TABLE `email_accounts` MODIFY COLUMN `accessTokenCiphertext` text;--> statement-breakpoint
ALTER TABLE `email_accounts` ADD `authMethod` enum('app_password','oauth2') DEFAULT 'app_password' NOT NULL;--> statement-breakpoint
ALTER TABLE `email_accounts` ADD `imapHost` varchar(255);--> statement-breakpoint
ALTER TABLE `email_accounts` ADD `imapPort` int DEFAULT 993;--> statement-breakpoint
ALTER TABLE `email_accounts` ADD `imapSecure` boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE `email_accounts` ADD `imapUsername` varchar(320);--> statement-breakpoint
ALTER TABLE `email_accounts` ADD `imapPasswordCiphertext` text;--> statement-breakpoint
ALTER TABLE `email_accounts` ADD `imapMailbox` varchar(255) DEFAULT 'INBOX' NOT NULL;