/* --------------------
 * terser-sync module
 * Entry point
 * ------------------*/

'use strict';

// Modules
const terser = require('terser'),
	{minify} = terser,
	hasOwnProp = require('has-own-prop');

// Imports
const createSourceMap = require('./sourceMap.js');

// Exports

module.exports = {...terser, minifySync};

/**
 * Synchronous version of `terser.minify()`.
 * Output should be identical to `terser.minify()` and supports all options `terser.minify()` does.
 *
 * Calls `minify()` and uses some hacks to extract internal state from within `minify()` and fool
 * it into using a synchronous implementation of source map parser to get the result synchronously.
 *
 * @param {string|Array|Object} files - Input files
 * @param {Object} [options] - Options
 * @returns {Object} - Properties depend on options
 * @throws {Error} - If `minify()` errors or injection fails
 */
function minifySync(files, options) {
	let result, err;

	// Conform files
	options = {...options};
	if (
		typeof files === 'string'
		|| (options.parse && options.parse.spidermonkey && !Array.isArray(files))
	) {
		files = [files];
	}

	// First thing Terser does is clone the options object and add defaults to it.
	// https://github.com/terser/terser/blob/d225b75e82770d0d7eedf011e4769d18a43de9c0/lib/minify.js#L64
	// Capture the cloned options object via a setter on `Object.prototype.spidermonkey`
	// which is triggered when Terser sets the `.spidermonkey` property on the cloned object.
	// We need Terser's clone of options object in order to manipulate its `.sourceMap` property later.
	const originalSpidermonkeyOpt = !!options.spidermonkey;
	delete options.spidermonkey;

	let hasCapturedClonedOptions = false;
	captureObjectViaObjectPrototypeSetter('spidermonkey', (clonedOptions) => {
		options = clonedOptions;
		hasCapturedClonedOptions = true;
		options.spidermonkey = originalSpidermonkeyOpt;
	});

	// Terser's code includes `if (options.format.ast) { result.ast = toplevel; }`.
	// https://github.com/terser/terser/blob/d225b75e82770d0d7eedf011e4769d18a43de9c0/lib/minify.js#L216
	// `result` is the result object returned by Terser that we want to capture.
	// Define a getter on `options.format.ast` which returns `true` and then installs a setter
	// on `Object.prototype.ast` to capture `result` in next statement `result.ast = toplevel`.
	// This allows us to capture `result` before the promise returned by `minify()` resolves.
	const format = options.format = options.format || {};
	let hasSubtitutedSourceMap = false;

	shimGetter(format, 'ast', true, () => {
		captureObjectViaObjectPrototypeSetter('ast', (capturedResult, ast) => {
			result = capturedResult;
			if (format.ast) result.ast = ast;
			substituteSourceMapImplementation();
		});
	});

	function substituteSourceMapImplementation() {
		// Skip if source map will not be created
		const {sourceMap} = options;
		if (!sourceMap || (hasOwnProp(format, 'code') && !format.code)) {
			hasSubtitutedSourceMap = true;
			return;
		}

		// Define getter for `options.sourceMap` that returns `false` to prevent Terser initializing
		// source map asynchronously. Then create a source map synchronously instead.
		// This short-circuits section of code which includes the async call:
		// https://github.com/terser/terser/blob/d225b75e82770d0d7eedf011e4769d18a43de9c0/lib/minify.js#L223
		shimGetter(options, 'sourceMap', false, () => {
			hasSubtitutedSourceMap = true;

			try {
				createSourceMap(options, files);
			} catch (e) {
				err = e;
				throw err;
			}
		});
	}

	// Run Terser
	const promise = minify(files, options).catch(e => e);

	// If failed, throw error with `.promise` property which resolves to the error
	if (!err) {
		if (!hasCapturedClonedOptions) {
			err = new Error('Failed to capture cloned options');
		} else if (!hasSubtitutedSourceMap) {
			err = new Error('Failed to skip async source map initialization');
		} else if (!result) {
			err = new Error('Unknown error - await `error.promise` to get error details');
		}
	}

	if (err) {
		err.promise = promise;
		throw err;
	}

	// Return result
	return result;
}

/**
 * Capture an Object internal to Terser when Terser sets a property on it.
 * Works by creating a setter on `Object.prototype` which will be triggered when property is set
 * on Object we're interested in.
 * @param {string} propName - Property name to create setter for
 * @param {Function} cb - Callback, called with object and value which was written to property
 * @returns {undefined}
 */
function captureObjectViaObjectPrototypeSetter(propName, cb) {
	shimObject(Object.prototype, propName, 'set', cb);
}

/**
 * Catch when Terser reads a property on an Object.
 * This is used to return a desired value to fool Terser into doing something it shouldn't,
 * or to be alerted to when it's up to a particular point in execution so we can take some
 * other action at that point.
 * @param {Object} obj - Object to shim
 * @param {string} propName - Property name to create getter/setter on
 * @param {*} value - Value to return from getter
 * @param {Function} cb - Callback, called with no args
 * @returns {undefined}
 */
function shimGetter(obj, propName, value, cb) {
	shimObject(obj, propName, 'get', () => {
		cb();
		return value;
	});
}

/**
 * Shim Object property with a getter/setter.
 * As soon as getter/setter is called, the shim is removed again.
 * Call callback with object and value setter was called with (if it's a setter).
 * @param {Object} obj - Object to shim
 * @param {string} propName - Property name to create getter/setter on
 * @param {string} getOrSet - 'get' or 'set'
 * @param {Function} cb - Callback, called with object and value setter was called with
 * @returns {undefined}
 */
function shimObject(obj, propName, getOrSet, cb) {
	const descriptor = Object.getOwnPropertyDescriptor(obj, propName);
	Object.defineProperty(obj, propName, {
		[getOrSet](value) {
			// Restore to as it was before
			if (descriptor) {
				Object.defineProperty(obj, propName, descriptor);
			} else {
				delete obj[propName];
			}

			return cb(this, value);
		},
		configurable: true
	});
}
