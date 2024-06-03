# Scoped JSR

This tool functions as a npm registry which proxy all packages to there corresponding jsr packages. It allows imports like `@std/semver` instead of `@jsr/std__semver`.

**Disclaimer:**

This tool is a work in progress and may not be stable. I tested it with some packages and it worked fine for me. But I can't guarantee that it will work for you.

## Usage

Imagine you want to use some packages from the `@std` JSR scope.

Currently you may have a setup like this:

`.npmrc`

```
@jsr:registry=https://npm.jsr.io
```

`package.json`

```jsonc
{
    "name": "my-package",
    "version": "1.0.0",
    ...
    "dependencies": {
        "@std/semver": "npm:@jsr/std__semver@^0.224.2" // <- this part seems not so pretty imho
    }
}
```

With this setup i personally run into some issues, when working with workspaces. Because `bun` installs JSR packages to the package `node_modules` folder instead of the workspace `node_modules` folder.

---

### Using this tool

When using this tool thinks looks like this:

`.npmrc`

```
@jsr:registry=https://npm.jsr.io

# every jsr scope you want needs to be added here
@std:registry=https://scoped-jsr.deno.dev

# for example for hono's jsr packages
@hono:registry=https://scoped-jsr.deno.dev
```

`package.json`

```jsonc
{
    "name": "my-package",
    "version": "1.0.0",
    ...
    "dependencies": {
        "@std/semver": "^0.224.2" // <- this part looks now familiar
    }
}
```

As you can see the dependency record seems a bit more readable and cleaner now. Your source code will be not affected by this change and work as before.

## Hosted version

Currently there is a hosted version available at https://scoped-jsr.deno.dev which is hosted on deno deploy on my personal free account. I **CANNOT GUARANTEE** that this deployment is always available and there may be some issue with rate limiting or insufficient resources. Use it at your own risk and for testing purposes.

## Self hosted

You can easily self host this tool by cloning it and running `deno run -A --unstable-kv ./src/index.ts`. If requested I may provide some more configuration options for self hosting.

## What happen in the background?

Lets assume we want the `@std/semver` package. This tool provides a "proxy package" which forwards all exports to the actual `@jsr/std__semver` package.

A simplified package by this tool may looks like this:

`package.json`

```
{
    "name": "@std/semver",
    "version": "0.224.2",
    "exports": {
        ".": {
            "default": "./entry/index.js",
            "types": "./entry/index.d.ts"
        }
    },
    "dependencies": {
        "@jsr/std__semver": "0.224.2"
    }
}
```

`entry/index.js`

```typescript
export * from "@jsr/std__semver";
```

`entry/index.d.ts`

```typescript
export * from "@jsr/std__semver";
```

As you can see it re-exports the actual `@jsr/std__semver` package. This way we don't have issues with other dependencies. You can also use the "official jsr way" with some packages using this tool.

**Also important to notice**: You always need the `@jsr` scope in your `.npmrc` file for this tool to work.

## Something is not working as expected?

Please open an issue and I will try to help you out.

## Contributing

If you want to contribute to this project please feel free to open an issue or a pull request.

## License

MIT
