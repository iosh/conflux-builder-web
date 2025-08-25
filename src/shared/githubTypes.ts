import { RestEndpointMethodTypes } from "@octokit/rest";

export type GithubReleaseAsset = GithubRelease["assets"][number];

export type GithubRelease =
  RestEndpointMethodTypes["repos"]["getReleaseByTag"]["response"]["data"];

export type GitHubTag =
  RestEndpointMethodTypes["repos"]["listTags"]["response"]["data"][number];
