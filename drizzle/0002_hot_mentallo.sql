CREATE TABLE `trainings` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`description` text NOT NULL,
	`videos` text NOT NULL,
	`questions` text NOT NULL,
	`published` integer DEFAULT 0 NOT NULL,
	`starts_at` text,
	`ends_at` text,
	`revision` integer DEFAULT 1 NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
ALTER TABLE `attempts` ADD `training_id` text DEFAULT 'induccion' NOT NULL;--> statement-breakpoint
ALTER TABLE `attempts` ADD `training_revision` integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE `attempts` ADD `snapshot` text;