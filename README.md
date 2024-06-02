# A JSR NPM Proxy

This proxy allows you to use any JSR package from its original scope like `@std/semver` instead of `@jsr/std__semver`.

## TODO

Serve packages like this:

`@std/semver` resolves to a package with one depedency (`@jsr/std__semver`).
It also have one main file which looks something like this:

```typescript
export * from "@jsr/std__semver";
```

It is only a "proxy" package which forwards all to the actual `@jsr/std__semver` package.
This way we dont have issues with dependencies.

## Hosting

This can be hosted on deno deploy and we offer a hosted version.
