import { describe, it, expect, beforeEach, vi } from "vitest";
vi.mock("next/cache", () => {
  return {
    unstable_cache: vi.fn((fn: any, _keyParts: any[], _options: any) => fn),
  };
});

vi.mock("@octokit/rest", () => {
  const getRef = vi.fn().mockResolvedValue({
    data: { object: { sha: "abcdef1234567890" } },
  });
  const getReleaseByTag = vi.fn().mockResolvedValue({
    data: { id: 1, tag_name: "v1.2.3-abcdef1", assets: [] },
  });
  class Octokit {
    git = { getRef };
    repos = { getReleaseByTag };
    constructor(..._args: any[]) {}
  }
  return { Octokit };
});

import { unstable_cache } from "next/cache";
import { getCommitShaForTag, getReleaseByTag } from "@/services/githubService";

const unstableCacheMock = vi.mocked(unstable_cache);
describe("githubService per-tag cache keys and tags", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("getCommitShaForTag('v1.2.3') uses keyParts with tag and tags with commit-sha:<tag>", async () => {
    const tag = "v1.2.3";
    await getCommitShaForTag(tag);

    expect(unstableCacheMock).toHaveBeenCalledTimes(1);
    const [fn, keyParts, options] = unstableCacheMock.mock.calls[0];
    expect(typeof fn).toBe("function");
    expect(keyParts).toEqual(["commit-sha-for-tag", tag]);
    expect(options?.tags).toEqual([`commit-sha:${tag}`]);
  });

  it("getReleaseByTag('v1.2.3') uses keyParts with tag and tags include both release and commit-sha tags", async () => {
    const tag = "v1.2.3";
    await getReleaseByTag(tag);

    expect(unstableCacheMock).toHaveBeenCalled();
    const calls = unstableCacheMock.mock.calls as any[];
    const releaseCall = calls.find(
      ([, keyParts]) =>
        Array.isArray(keyParts) && keyParts[0] === "github-release-by-tag"
    );
    expect(releaseCall).toBeTruthy();
    const [, keyParts, options] = releaseCall as any;
    expect(keyParts).toEqual(["github-release-by-tag", tag]);
    expect(options?.tags).toEqual(
      expect.arrayContaining([`github-release:${tag}`, `commit-sha:${tag}`])
    );
  });
});
