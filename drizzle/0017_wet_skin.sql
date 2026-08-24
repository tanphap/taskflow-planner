CREATE TABLE `timesheet_duty_schedules` (
	`id` int AUTO_INCREMENT NOT NULL,
	`dutyDate` varchar(10) NOT NULL,
	`shift` enum('S','D') NOT NULL,
	`assignment` varchar(240) NOT NULL,
	`sourceTitle` varchar(240) NOT NULL,
	`createdByUserId` int NOT NULL,
	`updatedByUserId` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `timesheet_duty_schedules_id` PRIMARY KEY(`id`),
	CONSTRAINT `timesheet_duty_schedules_date_shift_uq` UNIQUE(`dutyDate`,`shift`)
);
--> statement-breakpoint
CREATE INDEX `timesheet_duty_schedules_date_idx` ON `timesheet_duty_schedules` (`dutyDate`);