CREATE TABLE `people` (
	`person` text PRIMARY KEY NOT NULL,
	`doc_type` text NOT NULL,
	`name` text NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `roster_imports` (
	`id` text PRIMARY KEY NOT NULL,
	`source` text NOT NULL,
	`payload_hash` text NOT NULL,
	`stats` text NOT NULL,
	`created_at` text NOT NULL
);
