CREATE TABLE `email_accounts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`provider` enum('google','microsoft') NOT NULL,
	`email` varchar(320) NOT NULL,
	`displayName` varchar(240),
	`accessTokenCiphertext` text NOT NULL,
	`refreshTokenCiphertext` text,
	`tokenExpiresAt` timestamp,
	`scopes` varchar(1000),
	`connectionStatus` enum('connected','needs_reconnect','error') NOT NULL DEFAULT 'connected',
	`lastSyncedAt` timestamp,
	`lastSyncError` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `email_accounts_id` PRIMARY KEY(`id`),
	CONSTRAINT `email_accounts_user_provider_email_uq` UNIQUE(`userId`,`provider`,`email`)
);
--> statement-breakpoint
CREATE TABLE `email_messages` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`emailAccountId` int NOT NULL,
	`providerMessageId` varchar(255) NOT NULL,
	`threadId` varchar(255),
	`subject` varchar(500) NOT NULL,
	`senderName` varchar(240),
	`senderEmail` varchar(320),
	`snippet` text,
	`receivedAt` timestamp NOT NULL,
	`isRead` boolean NOT NULL DEFAULT false,
	`status` enum('new','in_progress','done','archived') NOT NULL DEFAULT 'new',
	`labels` varchar(1000),
	`webLink` varchar(1000),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `email_messages_id` PRIMARY KEY(`id`),
	CONSTRAINT `email_messages_account_provider_message_uq` UNIQUE(`emailAccountId`,`providerMessageId`)
);
--> statement-breakpoint
CREATE TABLE `email_oauth_sessions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`provider` enum('google','microsoft') NOT NULL,
	`stateHash` varchar(64) NOT NULL,
	`codeVerifier` varchar(128) NOT NULL,
	`expiresAt` timestamp NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `email_oauth_sessions_id` PRIMARY KEY(`id`),
	CONSTRAINT `email_oauth_sessions_state_uq` UNIQUE(`stateHash`)
);
--> statement-breakpoint
CREATE INDEX `email_accounts_user_status_idx` ON `email_accounts` (`userId`,`connectionStatus`);--> statement-breakpoint
CREATE INDEX `email_messages_user_received_idx` ON `email_messages` (`userId`,`receivedAt`);--> statement-breakpoint
CREATE INDEX `email_messages_user_status_idx` ON `email_messages` (`userId`,`status`);--> statement-breakpoint
CREATE INDEX `email_oauth_sessions_user_expiry_idx` ON `email_oauth_sessions` (`userId`,`expiresAt`);