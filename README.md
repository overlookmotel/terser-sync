[![NPM version](https://img.shields.io/npm/v/terser-sync.svg)](https://www.npmjs.com/package/terser-sync)
[![Build Status](https://img.shields.io/github/workflow/status/overlookmotel/terser-sync/Test.svg)](https://github.com/overlookmotel/terser-sync/actions)
[![Dependency Status](https://img.shields.io/david/overlookmotel/terser-sync.svg)](https://david-dm.org/overlookmotel/terser-sync)
[![Dev dependency Status](https://img.shields.io/david/dev/overlookmotel/terser-sync.svg)](https://david-dm.org/overlookmotel/terser-sync)
[![Coverage Status](https://img.shields.io/coveralls/overlookmotel/terser-sync/master.svg)](https://coveralls.io/r/overlookmotel/terser-sync)

# Execute Terser minify synchronously

## What is this?

A really hacky way of of getting [Terser](https://www.npmjs.com/package/terser) to run synchronously.

`terser.minify()` is async and returns a Promise. The reason for this is that Terser uses uses [source-map](https://www.npmjs.com/package/source-map) (which is implemented in WASM and is async) to parse input source maps. The entire rest of Terser's codebase is synchronous, but this one dependency forces Terser to be async too.

This package calls Terser with a specially crafted options object which tricks Terser into skipping over the async code and into using an older version of source-map (v0.5.7) which is pure JS and is synchronous.

`minifySync()` is born!

## Usage

This package is a drop-in replacement for Terser which adds a `minifySync()` method.

```js
const terser = require('terser-sync');

// Original async terser.minify()
const {code} = await terser.minify('() => {}');

// Sync version - options are exactly the same
const {code} = terser.minifySync('() => {}');
```

### Errors

If Terser throws an error, it's not possible to obtain it synchronously. `minifySync()` will throw an error synchronously and that error has a `.promise` property which will resolve to the error Terser threw.

```js
try {
  terser.minifySync( '() => {}', { nonExistentOption: true } );
} catch (e) {
  const err = await e.promise;
  // err.message === '`nonExistentOption` is not a supported option'
}
```

## Versioning

This module follows [semver](https://semver.org/). Breaking changes will only be made in major version updates.

All active NodeJS release lines are supported (v12+ at time of writing). After a release line of NodeJS reaches end of life according to [Node's LTS schedule](https://nodejs.org/en/about/releases/), support for that version of Node may be dropped at any time, and this will not be considered a breaking change. Dropping support for a Node version will be made in a minor version update (e.g. 1.2.0 to 1.3.0). If you are using a Node version which is approaching end of life, pin your dependency of this module to patch updates only using tilde (`~`) e.g. `~1.2.3` to avoid breakages.

## Tests

Use `npm test` to run the tests. Use `npm run cover` to check coverage.

## Changelog

See [changelog.md](https://github.com/overlookmotel/terser-sync/blob/master/changelog.md)

## Issues

If you discover a bug, please raise an issue on Github. https://github.com/overlookmotel/terser-sync/issues

## Contribution

Pull requests are very welcome. Please:

* ensure all tests pass before submitting PR
* add tests for new features
* document new functionality/API additions in README
* do not add an entry to Changelog (Changelog is created when cutting releases)
