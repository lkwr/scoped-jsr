import { fromJsrPackageName } from "../npm/jsr.ts";
import { PackageInfo, PackageVersionInfo, PackageVersionDistInfo } from "../npm/types.ts";
import { getTarball } from "./tarball.ts";

export const createProxyRegistryPackage = async (
  original: PackageInfo,
  origin: string
): Promise<PackageInfo> => {
  const newName = fromJsrPackageName(original.name);

  const newVersions: PackageInfo["versions"] = {};

  await Promise.all(
    Object.entries(original.versions).map(async ([version, data]): Promise<void> => {
      newVersions[version] = {
        name: newName,
        version: data.version,
        description: data.description,

        dist: await getProxyDist(data, newName, origin),
        dependencies: { [data.name]: data.version },
      };
    })
  );

  return {
    name: newName,
    description: original.description,
    "dist-tags": original["dist-tags"],
    versions: newVersions,
    time: original.time,
  };
};

const getProxyDist = async (
  packageVersion: PackageVersionInfo,
  newName: string,
  origin: string
): Promise<PackageVersionDistInfo> => {
  const tarball = await getTarball(packageVersion);
  const tarballUrl = new URL(`/${newName}/-/${packageVersion.version}.tgz`, origin);

  return {
    tarball: tarballUrl.toString(),
    shasum: tarball.shasum,
    integrity: tarball.integrity,
  };
};
