import { z } from "zod";

export const SemVer = z.string().regex(
  // see https://semver.org/
  /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-((?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*)(?:\.(?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*))*))?(?:\+([0-9a-zA-Z-]+(?:\.[0-9a-zA-Z-]+)*))?$/
);
export type SemVer = z.infer<typeof SemVer>;

export const PackageName = z.string().regex(/^@[a-z0-9]+\/[a-z0-9_]+$/);
export type PackageName = z.infer<typeof PackageName>;

export const PackageVersionDistInfo = z.object({
  tarball: z.string().url(),
  shasum: z.string(),
  integrity: z.string(),
});
export type PackageVersionDistInfo = z.infer<typeof PackageVersionDistInfo>;

export const PackageVersionInfo = z.object({
  name: z.string(),
  description: z.string().optional(),

  version: SemVer,

  dist: PackageVersionDistInfo,

  dependencies: z.record(z.string(), z.string()),
});
export type PackageVersionInfo = z.infer<typeof PackageVersionInfo>;

export const PackageInfo = z.object({
  name: z.string(),
  description: z.string().optional(),

  "dist-tags": z.record(z.string(), SemVer),

  versions: z.record(SemVer, PackageVersionInfo),

  time: z.record(
    z.union([z.literal("created"), z.literal("modified"), SemVer]),
    z.coerce.date()
  ),
});
export type PackageInfo = z.infer<typeof PackageInfo>;

export const PackageJsonExport = z.record(
  z.string(),
  z.union([z.string(), z.record(z.string(), z.string())])
);
export type PackageJsonExport = z.infer<typeof PackageJsonExport>;

export const PackageJson = z.object({
  name: PackageName,
  version: SemVer,
  description: z.string().optional(),
  type: z.literal("module"),
  exports: PackageJsonExport.optional(),
  dependencies: z.record(z.string(), z.string()).optional(),
});
export type PackageJson = z.infer<typeof PackageJson>;
