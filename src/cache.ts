import { Buffer } from "@std/io";
import { PackageName, SemVer } from "./npm/types.ts";
import { Tarball } from "./proxied/tarball.ts";

export class TarballCache {
  private _kv: Deno.Kv | undefined = undefined;

  async init(): Promise<TarballCache> {
    if (this._kv) throw new Error("TarballCache already initialized");
    this._kv = await Deno.openKv();
    return this;
  }

  private get kv(): Deno.Kv {
    if (!this._kv) throw new Error("TarballCache not initialized");
    return this._kv;
  }

  async get(packageName: PackageName, version: SemVer): Promise<Tarball | null> {
    if (!this.kv) throw new Error("TarballCache not initialized");

    const result = await this.kv.get<{ buffer: Uint8Array; shasum: string; integrity: string }>(
      ["tarball", packageName, version]
    );

    if (!result.value) return null;

    return {
      buffer: new Buffer(result.value.buffer),
      shasum: result.value.shasum,
      integrity: result.value.integrity,
    };
  }

  async put(packageName: PackageName, version: SemVer, tarball: Tarball): Promise<void> {
    await this.kv.set(
      ["tarball", packageName, version],
      {
        buffer: tarball.buffer.bytes(),
        shasum: tarball.shasum,
        integrity: tarball.integrity,
      },
      { expireIn: 60 * 60 * 1000 /* 1 hour */ }
    );
  }

  async tryGet(
    packageName: PackageName,
    version: SemVer,
    fallback: () => Promise<Tarball>
  ): Promise<Tarball> {
    let result = await this.get(packageName, version);
    if (result) return result;

    result = await fallback();
    await this.put(packageName, version, result);
    return result;
  }
}
