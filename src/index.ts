import { Hono } from "@hono/hono";
import { logger } from "@hono/hono/logger";
import { getJsrPackage } from "./npm/jsr.ts";
import { createProxyRegistryPackage } from "./proxied/registry.ts";
import { SemVer } from "./npm/types.ts";
import { ZodError } from "zod";
import { getTarball } from "./proxied/tarball.ts";

const hono = new Hono();

hono.use(logger());

hono.get("/:scope{@[a-z0-9]+}/:name{[a-z0-9_]+}", async (c) => {
  const url = new URL(c.req.url);
  const { scope, name } = c.req.param();

  const jsrPackage = await getJsrPackage(scope, name);

  if (!jsrPackage) {
    c.status(404);
    return c.text("404 - Not Found");
  }

  const proxyPackage = await createProxyRegistryPackage(jsrPackage, url.origin);

  return c.json(proxyPackage);
});

hono.get("/:scope{@[a-z0-9]+}/:name{[a-z0-9_]+}/-/:version_tgz", async (c) => {
  const { scope, name, version_tgz } = c.req.param();

  const version = SemVer.parse(version_tgz.replace(/\.tgz$/, ""));
  const jsrPackage = await getJsrPackage(scope, name);
  const packageVersion = jsrPackage?.versions[version];

  if (!packageVersion) {
    c.status(404);
    return c.text("404 - Not Found");
  }

  const tarball = await getTarball(packageVersion);

  return c.body(tarball.buffer.bytes(), { headers: { "content-type": "application/gzip" } });
});

hono.notFound((c) => {
  c.status(400);
  return c.text("400 - Bad Request");
});

hono.onError((err, c) => {
  if (err instanceof ZodError) {
    c.status(400);
    return c.text("400 - Bad Request");
  }

  c.status(500);
  return c.text("500 - Internal Server Error");
});

Deno.serve({ port: 8000 }, (req) => {
  const url = new URL(req.url);
  url.pathname = url.pathname.replace(/%2f/g, "/");

  const newReq = new Request(url, req);

  return hono.fetch(newReq);
});
