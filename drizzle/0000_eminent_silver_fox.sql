CREATE TABLE `attempts` (
	`id` text PRIMARY KEY NOT NULL,
	`person` text NOT NULL,
	`name` text NOT NULL,
	`score` integer NOT NULL,
	`date` text NOT NULL,
	`consent` integer NOT NULL,
	`answers` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `lookup_limits` (
	`key` text PRIMARY KEY NOT NULL,
	`count` integer NOT NULL
);
