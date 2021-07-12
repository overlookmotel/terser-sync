/* --------------------
 * terser-sync module
 * Create source map synchronously
 * ------------------*/

/* eslint-disable camelcase */

'use strict';

// Modules
const MOZ_SourceMap = require('source-map'),
	HOP = require('has-own-prop'),
	{isObject} = require('is-it-type');

// Exports

/**
 * Create source map synchronously.
 * Logic copied from
 * https://github.com/terser/terser/blob/d225b75e82770d0d7eedf011e4769d18a43de9c0/lib/minify.js#L224
 * @param {Object} options - Options object
 * @param {Array|Object} files - Files
 * @returns {undefined}
 * @throws {Error} - If error
 */
module.exports = function createSourceMap(options, files) {
	options.format.source_map = SourceMap({
		file: options.sourceMap.filename,
		orig: options.sourceMap.content,
		root: options.sourceMap.root
	});

	if (options.sourceMap.includeSources) {
		if (isObject(files)) {
			throw new Error('original source content unavailable');
		} else {
			for (const name in files) {
				if (HOP(files, name)) {
					options.format.source_map.get().setSourceContent(name, files[name]);
				}
			}
		}
	}
};

/**
 * Create SourceMap interface.
 * Copied verbatim from
 * https://github.com/terser/terser/blob/d225b75e82770d0d7eedf011e4769d18a43de9c0/lib/sourcemap.js#L52
 * except `await new MOZ_SourceMap.SourceMapConsumer()` substituted for a sync version.
 * @param {Object} options - Options object
 * @returns {Object} - SourceMap interface
 */
function SourceMap(options) {
	options = defaults(options, {
		file: null,
		root: null,
		orig: null,

		orig_line_diff: 0,
		dest_line_diff: 0
	});

	let orig_map;
	const generator = new MOZ_SourceMap.SourceMapGenerator({
		file: options.file,
		sourceRoot: options.root
	});

	if (options.orig) {
		orig_map = new MOZ_SourceMap.SourceMapConsumer(options.orig);
		orig_map.sources.forEach((source) => {
			const sourceContent = orig_map.sourceContentFor(source, true);
			if (sourceContent) {
				generator.setSourceContent(source, sourceContent);
			}
		});
	}

	function add(source, gen_line, gen_col, orig_line, orig_col, name) {
		if (orig_map) {
			const info = orig_map.originalPositionFor({
				line: orig_line,
				column: orig_col
			});
			if (info.source === null) {
				return;
			}
			source = info.source;
			orig_line = info.line;
			orig_col = info.column;
			name = info.name || name;
		}
		generator.addMapping({
			generated: {line: gen_line + options.dest_line_diff, column: gen_col},
			original: {line: orig_line + options.orig_line_diff, column: orig_col},
			source,
			name
		});
	}

	return {
		add,
		get() { return generator; },
		toString() { return generator.toString(); },
		destroy() {
			if (orig_map && orig_map.destroy) {
				orig_map.destroy();
			}
		}
	};
}

/**
 * Apply defaults to options object.
 * Copied verbatim from
 * https://github.com/terser/terser/blob/d225b75e82770d0d7eedf011e4769d18a43de9c0/lib/utils/index.js#L64
 * except one section which is not used here commented out.
 * @param {Object|boolean} args - Args
 * @param {Object} defs - Defaults definition
 * @param {boolean} croak - Not used
 * @returns {Object} - Conformed object
 */
function defaults(args, defs, croak) { // eslint-disable-line no-unused-vars
	if (args === true) {
		args = {};
	} else if (args != null && typeof args === 'object') {
		args = {...args};
	}

	const ret = args || {};

	/*
	// No need for this
	if (croak) {
		for (const i in ret) {
			if (HOP(ret, i) && !HOP(defs, i)) {
				throw new DefaultsError(`\`${i}\` is not a supported option`, defs);
			}
		}
	}
	*/

	for (const i in defs) {
		if (HOP(defs, i)) {
			if (!args || !HOP(args, i)) {
				ret[i] = defs[i];
			} else if (i === 'ecma') {
				let ecma = args[i] | 0; // eslint-disable-line no-bitwise
				if (ecma > 5 && ecma < 2015) ecma += 2009;
				ret[i] = ecma;
			} else {
				ret[i] = (args && HOP(args, i)) ? args[i] : defs[i];
			}
		}
	}

	return ret;
}
