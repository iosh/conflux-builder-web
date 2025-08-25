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
CREATE UNIQUE INDEX `unique_build_config` ON `builds` (`commit_sha`,`version_tag`,`os`,`arch`,`glibc_version`,`openssl_version`,`static_openssl`,`compatibility_mode`);