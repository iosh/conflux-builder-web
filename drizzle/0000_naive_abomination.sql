CREATE TABLE `builds` (
	`id` integer PRIMARY KEY NOT NULL,
	`commit_sha` text NOT NULL,
	`version_tag` text NOT NULL,
	`os` text NOT NULL,
	`arch` text NOT NULL,
	`glibc_version` text,
	`openssl_version` text,
	`static_openssl` integer DEFAULT true,
	`compatibility_mode` integer DEFAULT false,
	`run_id` text,
	`github_action_run_id` text,
	`status` text DEFAULT 'pending',
	`download_url` text,
	`created_at` integer DEFAULT (strftime('%s', 'now')) NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `tags` (
	`id` integer PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`commit_sha` text NOT NULL,
	`created_at` integer DEFAULT (strftime('%s', 'now')),
	`updated_at` integer
);
--> statement-breakpoint
CREATE UNIQUE INDEX `tags_name_unique` ON `tags` (`name`);