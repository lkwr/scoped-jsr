import { Tar } from "@std/archive";
import { encodeBase64, encodeHex } from "@std/encoding";
import { Buffer, copy, readerFromStreamReader, toReadableStream } from "@std/io";
import { PackageJson, PackageJsonExport, PackageVersionInfo } from "../npm/types.ts";
import { TarballCache } from "../cache.ts";
import { fromJsrPackageName, getJsrPackageJson } from "../npm/jsr.ts";

export type Tarball = {
  buffer: Buffer;
  shasum: string;
  integrity: string;
};

const cache = await new TarballCache().init();

const encoder = new TextEncoder();

export const getTarball = (packageVersion: PackageVersionInfo): Promise<Tarball> => {
  const newName = fromJsrPackageName(packageVersion.name);

  return cache.tryGet(newName, packageVersion.version, () =>
    createTarball(packageVersion, newName)
  );
};

const createTarball = async (
  packageVersion: PackageVersionInfo,
  newName: string
): Promise<Tarball> => {
  const tar = await createTar(packageVersion, newName);

  // create gzipped tarball
  const readableGzip = toReadableStream(tar.getReader()).pipeThrough(
    new CompressionStream("gzip")
  );

  const tgzBuffer = new Buffer();

  await copy(readerFromStreamReader(readableGzip.getReader()), tgzBuffer);

  const [sha1, sha512] = await Promise.all([
    crypto.subtle.digest("SHA-1", tgzBuffer.bytes()),
    crypto.subtle.digest("SHA-512", tgzBuffer.bytes()),
  ]);

  return {
    buffer: tgzBuffer,
    shasum: encodeHex(sha1).toUpperCase(),
    integrity: `sha512-${encodeBase64(sha512)}`,
  };
};

const createTar = async (packageVersion: PackageVersionInfo, newName: string): Promise<Tar> => {
  const tar = new Tar();

  // original package.json
  const originalPackageJson = await getJsrPackageJson(packageVersion);

  if (!originalPackageJson) throw new Error("Could not find original package.json");

  const exports = generateExports(originalPackageJson);

  await appendPackageJson({ tar, packageVersion, newName, originalPackageJson, exports });

  for (const exportName of Object.keys(exports)) {
    const normalizedExportName = exportName.replace(/^\.\/?/, "");
    const normalizedExportFileName = normalizedExportName.replace(/\//g, "_");

    const importName =
      normalizedExportName === ""
        ? packageVersion.name
        : `${packageVersion.name}/${normalizedExportName}`;

    await appendExportFile(
      tar,
      `entry/${normalizedExportFileName || "index"}.js`,
      importName,
      "esm"
    );
    await appendExportFile(
      tar,
      `entry/${normalizedExportFileName || "index"}.d.ts`,
      importName,
      "dts"
    );
  }

  return tar;
};

const generateExports = (packageJson: PackageJson): PackageJsonExport => {
  return Object.fromEntries(
    Object.keys(packageJson.exports ?? {}).map((key) => {
      const normalizedExportFileName = key.replace(/^\.\/?/, "").replace(/\//g, "_");

      return [
        key,
        {
          types: `./entry/${normalizedExportFileName || "index"}.d.ts`,
          default: `./entry/${normalizedExportFileName || "index"}.js`,
        },
      ];
    })
  );
};

const appendPackageJson = async ({
  tar,
  packageVersion,
  newName,
  exports,
}: {
  tar: Tar;
  packageVersion: PackageVersionInfo;
  originalPackageJson: PackageJson;
  newName: string;
  exports: PackageJson["exports"];
}): Promise<void> => {
  const packageJson: PackageJson = {
    name: newName,
    description: packageVersion.description,
    type: "module",
    version: packageVersion.version,
    dependencies: { [packageVersion.name]: packageVersion.version },
    exports,
  };

  const buffer = new Buffer(encoder.encode(JSON.stringify(packageJson, null, 2)));

  await tar.append("package/package.json", {
    reader: buffer,
    contentSize: buffer.length,
    mtime: 0,
  });
};

const appendExportFile = async (
  tar: Tar,
  fileName: string,
  exportFrom: string,
  format: "esm" | "cjs" | "dts"
): Promise<void> => {
  let buffer: Buffer;

  switch (format) {
    case "cjs": {
      // cjs re-export
      buffer = new Buffer(encoder.encode(`module.exports = require("${exportFrom}");`));
      break;
    }
    default: {
      // esm/dts re-export
      buffer = new Buffer(encoder.encode(`export * from "${exportFrom}";`));
      break;
    }
  }

  await tar.append(`package/${fileName}`, {
    reader: buffer,
    contentSize: buffer.length,
    mtime: 0,
  });
};
