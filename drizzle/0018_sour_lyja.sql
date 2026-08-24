ALTER TABLE `timesheet_duty_schedules` ADD `changeNote` varchar(400);--> statement-breakpoint
ALTER TABLE `timesheet_duty_schedules` ADD `isChanged` boolean DEFAULT false NOT NULL;