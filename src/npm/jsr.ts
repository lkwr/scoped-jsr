import { Untar } from "@std/archive";
import { readAll, readerFromStreamReader } from "@std/io";
import { PackageName, PackageInfo, PackageVersionInfo, PackageJson } from "./types.ts";

const NPM_REGISTRY_URL = "https://npm.jsr.io";

const decoder = new TextDecoder();

export const getJsrPackage = (scope: string, name: string): Promise<PackageInfo | null> => {
  // TODO use cache?
  return fetchJsrPackage(scope, name);
};

export const getJsrPackageJson = (version: PackageVersionInfo): Promise<PackageJson | null> => {
  // TODO use cache?
  return fetchJsrPackageJson(version);
};

const fetchJsrPackage = async (scope: string, name: string): Promise<PackageInfo | null> => {
  const url = new URL(NPM_REGISTRY_URL);
  url.pathname = `/${toJsrPackageName(scope, name)}`;

  const response = await fetch(url);

  if (!response.ok || response.headers.get("content-type") !== "application/json") return null;

  return PackageInfo.parse(await response.json());
};

const fetchJsrPackageJson = async (
  version: PackageVersionInfo
): Promise<PackageJson | null> => {
  const tarballRes = await fetch(version.dist.tarball);

  if (!tarballRes.ok || !tarballRes.body) return null;

  const unzipped = tarballRes.body.pipeThrough(new DecompressionStream("gzip"));

  const tar = new Untar(readerFromStreamReader(unzipped.getReader()));

  let entry;
  while ((entry = await tar.extract()) !== null) {
    if (entry.fileName === "package/package.json") {
      return PackageJson.parse(JSON.parse(decoder.decode(await readAll(entry))));
    }
  }

  return null;
};

export const fromJsrPackageName = (scopedName: string): string => {
  const combined = PackageName.parse(scopedName).split("/").at(1) ?? "";
  const [scope, name] = combined.split("__");
  return `@${scope}/${name}`;
};

export const toJsrPackageName = (scope: string, name: string) => {
  const normalizedScope = scope.replace(/^@/g, "");
  if (normalizedScope === "jsr") return `@${normalizedScope}/${name}`;
  return `@jsr/${normalizedScope}__${name}`;
};
