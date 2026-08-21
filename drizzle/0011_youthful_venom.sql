CREATE TABLE `daily_ai_quotes` (
	`dayKey` varchar(10) NOT NULL,
	`quoteVi` varchar(280) NOT NULL,
	`quoteEn` varchar(280) NOT NULL,
	`model` varchar(120) NOT NULL,
	`generatedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `daily_ai_quotes_dayKey` PRIMARY KEY(`dayKey`)
);
--> statement-breakpoint
CREATE TABLE `scheduled_jobs` (
	`jobKey` varchar(80) NOT NULL,
	`taskUid` varchar(65) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `scheduled_jobs_jobKey` PRIMARY KEY(`jobKey`)
);
--> statement-breakpoint
CREATE INDEX `scheduled_jobs_task_uid_idx` ON `scheduled_jobs` (`taskUid`);