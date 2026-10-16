CREATE TYPE "public"."email_auth_method" AS ENUM('app_password', 'oauth2');--> statement-breakpoint
CREATE TYPE "public"."email_connection_status" AS ENUM('connected', 'needs_reconnect', 'error');--> statement-breakpoint
CREATE TYPE "public"."email_event_suggestion_status" AS ENUM('pending', 'accepted', 'dismissed', 'error');--> statement-breakpoint
CREATE TYPE "public"."email_gemini_summary_status" AS ENUM('ready', 'error');--> statement-breakpoint
CREATE TYPE "public"."email_message_status" AS ENUM('new', 'in_progress', 'done', 'archived');--> statement-breakpoint
CREATE TYPE "public"."email_oauth_provider" AS ENUM('google', 'microsoft');--> statement-breakpoint
CREATE TYPE "public"."email_provider" AS ENUM('google', 'microsoft', 'webmail');--> statement-breakpoint
CREATE TYPE "public"."notification_kind" AS ENUM('task', 'event');--> statement-breakpoint
CREATE TYPE "public"."task_priority" AS ENUM('low', 'medium', 'high');--> statement-breakpoint
CREATE TYPE "public"."task_status" AS ENUM('todo', 'in_progress', 'done');--> statement-breakpoint
CREATE TYPE "public"."telegram_delivery_status" AS ENUM('success', 'error');--> statement-breakpoint
CREATE TYPE "public"."timesheet_access_role" AS ENUM('viewer', 'admin');--> statement-breakpoint
CREATE TYPE "public"."timesheet_shift" AS ENUM('S', 'D');--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('user', 'admin');--> statement-breakpoint
CREATE TABLE "calendar_events" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" integer NOT NULL,
	"title" varchar(240) NOT NULL,
	"description" text,
	"startAt" timestamp NOT NULL,
	"endAt" timestamp NOT NULL,
	"reminderAt" timestamp,
	"recurrenceRule" varchar(500),
	"telegramReminder" boolean DEFAULT false NOT NULL,
	"telegramJobUid" varchar(65),
	"telegramSentAt" timestamp,
	"telegramDeliveryError" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "daily_ai_quotes" (
	"dayKey" varchar(10) PRIMARY KEY NOT NULL,
	"quoteVi" varchar(280) NOT NULL,
	"quoteEn" varchar(280) NOT NULL,
	"model" varchar(120) NOT NULL,
	"generatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "email_accounts" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" integer NOT NULL,
	"provider" "email_provider" NOT NULL,
	"email" varchar(320) NOT NULL,
	"displayName" varchar(240),
	"authMethod" "email_auth_method" DEFAULT 'app_password' NOT NULL,
	"imapHost" varchar(255),
	"imapPort" integer DEFAULT 993,
	"imapSecure" boolean DEFAULT true NOT NULL,
	"imapUsername" varchar(320),
	"imapPasswordCiphertext" text,
	"imapMailbox" varchar(255) DEFAULT 'INBOX' NOT NULL,
	"accessTokenCiphertext" text,
	"refreshTokenCiphertext" text,
	"tokenExpiresAt" timestamp,
	"scopes" varchar(1000),
	"connectionStatus" "email_connection_status" DEFAULT 'connected' NOT NULL,
	"lastSyncedAt" timestamp,
	"lastSyncError" text,
	"lastSyncFetchedCount" integer DEFAULT 0 NOT NULL,
	"lastSyncNewCount" integer DEFAULT 0 NOT NULL,
	"mailboxMessageCount" integer DEFAULT 0 NOT NULL,
	"aiSyncEnabled" boolean DEFAULT false NOT NULL,
	"aiSyncIntervalMinutes" integer DEFAULT 60 NOT NULL,
	"aiSyncJobUid" varchar(65),
	"aiSyncLastRunAt" timestamp,
	"aiSyncLastError" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "email_event_suggestions" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" integer NOT NULL,
	"emailAccountId" integer NOT NULL,
	"emailMessageId" integer NOT NULL,
	"title" varchar(240) NOT NULL,
	"description" text,
	"startAt" timestamp NOT NULL,
	"endAt" timestamp NOT NULL,
	"reminderMinutes" integer DEFAULT 15 NOT NULL,
	"planLink" varchar(1000),
	"sourceExcerpt" varchar(1000),
	"confidence" integer NOT NULL,
	"model" varchar(80) NOT NULL,
	"status" "email_event_suggestion_status" DEFAULT 'pending' NOT NULL,
	"calendarEventId" integer,
	"errorMessage" varchar(1000),
	"analyzedAt" timestamp DEFAULT now() NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "email_gemini_summaries" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" integer NOT NULL,
	"emailAccountId" integer NOT NULL,
	"emailMessageId" integer NOT NULL,
	"summary" text NOT NULL,
	"eventStartAt" timestamp,
	"eventEndAt" timestamp,
	"locale" varchar(12) DEFAULT 'vi' NOT NULL,
	"model" varchar(120) NOT NULL,
	"status" "email_gemini_summary_status" DEFAULT 'ready' NOT NULL,
	"errorMessage" varchar(1000),
	"consentedAt" timestamp DEFAULT now() NOT NULL,
	"generatedAt" timestamp DEFAULT now() NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "email_messages" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" integer NOT NULL,
	"emailAccountId" integer NOT NULL,
	"providerMessageId" varchar(255) NOT NULL,
	"threadId" varchar(255),
	"subject" varchar(500) NOT NULL,
	"senderName" varchar(240),
	"senderEmail" varchar(320),
	"snippet" text,
	"receivedAt" timestamp NOT NULL,
	"isRead" boolean DEFAULT false NOT NULL,
	"status" "email_message_status" DEFAULT 'new' NOT NULL,
	"labels" varchar(1000),
	"webLink" varchar(1000),
	"aiAnalyzedAt" timestamp,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "email_notes" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" integer NOT NULL,
	"emailAccountId" integer,
	"emailMessageId" integer,
	"title" varchar(240) NOT NULL,
	"body" text,
	"isPinned" boolean DEFAULT false NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "email_oauth_sessions" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" integer NOT NULL,
	"provider" "email_oauth_provider" NOT NULL,
	"stateHash" varchar(64) NOT NULL,
	"codeVerifier" varchar(128) NOT NULL,
	"expiresAt" timestamp NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" integer NOT NULL,
	"sourceKey" varchar(96) NOT NULL,
	"kind" "notification_kind" NOT NULL,
	"title" varchar(240) NOT NULL,
	"body" text,
	"scheduledFor" timestamp NOT NULL,
	"readAt" timestamp,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "scheduled_jobs" (
	"jobKey" varchar(80) PRIMARY KEY NOT NULL,
	"taskUid" varchar(65) NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tasks" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" integer NOT NULL,
	"title" varchar(240) NOT NULL,
	"description" text,
	"status" "task_status" DEFAULT 'todo' NOT NULL,
	"priority" "task_priority" DEFAULT 'medium' NOT NULL,
	"dueAt" timestamp,
	"reminderAt" timestamp,
	"completedAt" timestamp,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "telegram_connections" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" integer NOT NULL,
	"chatId" varchar(64),
	"linkToken" varchar(96),
	"linkTokenExpiresAt" timestamp,
	"connectedAt" timestamp,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "telegram_delivery_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" integer NOT NULL,
	"eventId" integer NOT NULL,
	"eventTitle" varchar(240) NOT NULL,
	"sentAt" timestamp DEFAULT now() NOT NULL,
	"status" "telegram_delivery_status" NOT NULL,
	"errorMessage" varchar(500)
);
--> statement-breakpoint
CREATE TABLE "timesheet_access" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" integer NOT NULL,
	"grantedByUserId" integer NOT NULL,
	"accessRole" timesheet_access_role DEFAULT 'viewer' NOT NULL,
	"grantedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "timesheet_duty_schedules" (
	"id" serial PRIMARY KEY NOT NULL,
	"dutyDate" varchar(10) NOT NULL,
	"shift" timesheet_shift NOT NULL,
	"assignment" varchar(240) NOT NULL,
	"sourceTitle" varchar(240) NOT NULL,
	"changeNote" varchar(400),
	"isChanged" boolean DEFAULT false NOT NULL,
	"createdByUserId" integer NOT NULL,
	"updatedByUserId" integer NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"openId" varchar(64) NOT NULL,
	"name" text,
	"email" varchar(320),
	"geminiModel" varchar(80) DEFAULT 'gemini-3.5-flash-lite' NOT NULL,
	"loginMethod" varchar(64),
	"role" "user_role" DEFAULT 'user' NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	"lastSignedIn" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_openId_unique" UNIQUE("openId")
);
--> statement-breakpoint
CREATE INDEX "events_user_start_idx" ON "calendar_events" USING btree ("userId","startAt");--> statement-breakpoint
CREATE INDEX "events_user_reminder_idx" ON "calendar_events" USING btree ("userId","reminderAt");--> statement-breakpoint
CREATE INDEX "events_telegram_job_idx" ON "calendar_events" USING btree ("telegramJobUid");--> statement-breakpoint
CREATE UNIQUE INDEX "email_accounts_user_provider_email_uq" ON "email_accounts" USING btree ("userId","provider","email");--> statement-breakpoint
CREATE INDEX "email_accounts_user_status_idx" ON "email_accounts" USING btree ("userId","connectionStatus");--> statement-breakpoint
CREATE INDEX "email_accounts_ai_sync_job_idx" ON "email_accounts" USING btree ("aiSyncJobUid");--> statement-breakpoint
CREATE UNIQUE INDEX "email_event_suggestions_message_uq" ON "email_event_suggestions" USING btree ("emailMessageId");--> statement-breakpoint
CREATE INDEX "email_event_suggestions_user_status_idx" ON "email_event_suggestions" USING btree ("userId","status");--> statement-breakpoint
CREATE INDEX "email_event_suggestions_account_status_idx" ON "email_event_suggestions" USING btree ("emailAccountId","status");--> statement-breakpoint
CREATE UNIQUE INDEX "email_gemini_summaries_message_uq" ON "email_gemini_summaries" USING btree ("emailMessageId");--> statement-breakpoint
CREATE INDEX "email_gemini_summaries_user_generated_idx" ON "email_gemini_summaries" USING btree ("userId","generatedAt");--> statement-breakpoint
CREATE INDEX "email_gemini_summaries_account_idx" ON "email_gemini_summaries" USING btree ("emailAccountId");--> statement-breakpoint
CREATE UNIQUE INDEX "email_messages_account_provider_message_uq" ON "email_messages" USING btree ("emailAccountId","providerMessageId");--> statement-breakpoint
CREATE INDEX "email_messages_user_received_idx" ON "email_messages" USING btree ("userId","receivedAt");--> statement-breakpoint
CREATE INDEX "email_messages_user_status_idx" ON "email_messages" USING btree ("userId","status");--> statement-breakpoint
CREATE INDEX "email_notes_user_updated_idx" ON "email_notes" USING btree ("userId","updatedAt");--> statement-breakpoint
CREATE INDEX "email_notes_user_pinned_idx" ON "email_notes" USING btree ("userId","isPinned");--> statement-breakpoint
CREATE INDEX "email_notes_message_idx" ON "email_notes" USING btree ("emailMessageId");--> statement-breakpoint
CREATE INDEX "email_notes_account_idx" ON "email_notes" USING btree ("emailAccountId");--> statement-breakpoint
CREATE UNIQUE INDEX "email_oauth_sessions_state_uq" ON "email_oauth_sessions" USING btree ("stateHash");--> statement-breakpoint
CREATE INDEX "email_oauth_sessions_user_expiry_idx" ON "email_oauth_sessions" USING btree ("userId","expiresAt");--> statement-breakpoint
CREATE UNIQUE INDEX "notifications_source_uq" ON "notifications" USING btree ("sourceKey");--> statement-breakpoint
CREATE INDEX "notifications_user_read_idx" ON "notifications" USING btree ("userId","readAt");--> statement-breakpoint
CREATE INDEX "scheduled_jobs_task_uid_idx" ON "scheduled_jobs" USING btree ("taskUid");--> statement-breakpoint
CREATE INDEX "tasks_user_status_idx" ON "tasks" USING btree ("userId","status");--> statement-breakpoint
CREATE INDEX "tasks_user_due_idx" ON "tasks" USING btree ("userId","dueAt");--> statement-breakpoint
CREATE INDEX "tasks_user_reminder_idx" ON "tasks" USING btree ("userId","reminderAt");--> statement-breakpoint
CREATE UNIQUE INDEX "telegram_connections_user_uq" ON "telegram_connections" USING btree ("userId");--> statement-breakpoint
CREATE UNIQUE INDEX "telegram_connections_link_token_uq" ON "telegram_connections" USING btree ("linkToken");--> statement-breakpoint
CREATE INDEX "telegram_delivery_logs_user_sent_idx" ON "telegram_delivery_logs" USING btree ("userId","sentAt");--> statement-breakpoint
CREATE INDEX "telegram_delivery_logs_event_idx" ON "telegram_delivery_logs" USING btree ("eventId");--> statement-breakpoint
CREATE UNIQUE INDEX "timesheet_access_user_uq" ON "timesheet_access" USING btree ("userId");--> statement-breakpoint
CREATE INDEX "timesheet_access_granted_by_idx" ON "timesheet_access" USING btree ("grantedByUserId");--> statement-breakpoint
CREATE UNIQUE INDEX "timesheet_duty_schedules_date_shift_uq" ON "timesheet_duty_schedules" USING btree ("dutyDate","shift");--> statement-breakpoint
CREATE INDEX "timesheet_duty_schedules_date_idx" ON "timesheet_duty_schedules" USING btree ("dutyDate");