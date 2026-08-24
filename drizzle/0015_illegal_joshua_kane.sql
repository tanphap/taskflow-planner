CREATE TABLE `timesheet_access` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`grantedByUserId` int NOT NULL,
	`grantedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `timesheet_access_id` PRIMARY KEY(`id`),
	CONSTRAINT `timesheet_access_user_uq` UNIQUE(`userId`)
);
--> statement-breakpoint
CREATE INDEX `timesheet_access_granted_by_idx` ON `timesheet_access` (`grantedByUserId`);