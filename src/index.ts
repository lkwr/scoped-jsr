const REGISTRY_URL = "https://npm.jsr.io";

const VALID_PATHNAME_REGEX = /^\/@[a-z0-9]+(\/|%2f)[a-z0-9_]+/;
const PACKAGE_REGEX = /@([a-z0-9]+)\/([a-z0-9_]+)/;

type PackageResponse = {
  name: string;

  versions: Record<
    string,
    {
      name: string;
    }
  >;
};

const transformPackageResponse = (
  payload: PackageResponse,
  newName: string
): PackageResponse => {
  payload.name = newName;

  Object.keys(payload.versions).forEach((version) => {
    payload.versions[version].name = newName;
  });

  return payload;
};

const transformUrlPathname = (pathname: string) => {
  pathname = pathname.replace(/%2f/g, "/");

  pathname = pathname.replace(PACKAGE_REGEX, (str, scope, name) =>
    scope === "jsr" ? str : `@jsr/${scope}__${name}`
  );

  return pathname;
};

const extractPackageName = (pathname: string) => {
  pathname = pathname.replace(/%2f/g, "/");
  pathname = pathname.split("/").slice(1, 3).join("/");
  return pathname;
};

Deno.serve(async (req) => {
  const url = new URL(req.url);

  if (!url.pathname.match(VALID_PATHNAME_REGEX))
    return new Response(undefined, {
      status: 400,
    });

  const newName = extractPackageName(url.pathname);

  const newUrl = new URL(REGISTRY_URL);
  newUrl.pathname = transformUrlPathname(url.pathname);

  console.log(newUrl.pathname);

  const newRequest = new Request(newUrl, {
    method: req.method,
    headers: req.headers,
    body: req.body,
  });

  const response = await fetch(newRequest);

  if (!response.ok || response.headers.get("content-type") !== "application/json")
    return response;

  const json = await response.json();

  const transformed = transformPackageResponse(json as any, newName);

  console.log(transformed);

  return new Response(JSON.stringify(transformed), {
    status: response.status,
    headers: response.headers,
  });
});
