export type ReleaseAsset = {
  id: number;
  name: string;
  downloadUrl: string;
  size: number;
};

export type Release = {
  id: number;
  tagName: string;
  name: string | null;
  publishedAt: string | null;
  htmlUrl: string;
  assets: ReleaseAsset[];
};
