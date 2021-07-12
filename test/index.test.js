/* --------------------
 * terser-sync module
 * Tests
 * ------------------*/

'use strict';

// Modules
const terser = require('terser-sync'),
	terserOriginal = require('terser');

// Init
require('./support/index.js');

// Tests

describe('export', () => {
	it('is an Object', () => {
		expect(terser).toBeObject();
	});

	it('has minify method which is copy of original terser.minify', () => {
		expect(terser.minify).toBeFunction();
		expect(terser.minify).toBe(terserOriginal.minify);
	});

	it('has minifySync method', () => {
		expect(terser.minifySync).toBeFunction();
	});
});

const {minifySync, minify} = terser;
const inputCode = 'const foo = 1; module.exports = () => foo;';

describe('minifySync', () => {
	it('minifies code', async () => {
		const res = await expectSameResultAsAsync();
		expect(res).toEqual({code: 'const foo=1;module.exports=()=>1;'});
	});

	it('respects options', async () => {
		const res = await expectSameResultAsAsync({toplevel: true});
		expect(res).toEqual({code: 'module.exports=()=>1;'});
	});

	describe('produces source map', () => {
		it('in .map file', async () => {
			const res = await expectSameResultAsAsync({
				toplevel: true,
				sourceMap: {
					filename: 'out.js',
					url: 'out.js.map'
				}
			});
			expect(res).toEqual({
				code: 'module.exports=()=>1;\n//# sourceMappingURL=out.js.map',
				map: '{"version":3,"sources":["0"],"names":["module","exports"],"mappings":"AAAeA,OAAOC,QAAU,IAApB","file":"out.js"}'
			});
		});

		it('inline', async () => {
			const res = await expectSameResultAsAsync({
				toplevel: true,
				sourceMap: {
					filename: 'out.js',
					url: 'inline'
				}
			});
			expect(res).toEqual({
				code: 'module.exports=()=>1;\n//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIjAiXSwibmFtZXMiOlsibW9kdWxlIiwiZXhwb3J0cyJdLCJtYXBwaW5ncyI6IkFBQWVBLE9BQU9DLFFBQVUsSUFBcEIiLCJmaWxlIjoib3V0LmpzIn0=',
				map: '{"version":3,"sources":["0"],"names":["module","exports"],"mappings":"AAAeA,OAAOC,QAAU,IAApB","file":"out.js"}'
			});
		});

		it('with sources', async () => {
			const res = await expectSameResultAsAsync({
				toplevel: true,
				sourceMap: {
					filename: 'out.js',
					url: 'out.js.map',
					includeSources: true
				}
			});
			expect(res).toEqual({
				code: 'module.exports=()=>1;\n//# sourceMappingURL=out.js.map',
				map: '{"version":3,"sources":["0"],"names":["module","exports"],"mappings":"AAAeA,OAAOC,QAAU,IAApB","file":"out.js","sourcesContent":["const foo = 1; module.exports = () => foo;"]}'
			});
		});
	});

	it('records promise for error thrown by Terser', async () => {
		let didThrow = false;
		try {
			minifySync('() => {}', {nonExistentOption: true});
		} catch (e) {
			didThrow = true;

			/* eslint-disable jest/no-try-expect, jest/no-conditional-expect */
			expect(e).toBeInstanceOf(Error);
			expect(e.message).toBe('Failed to capture cloned options');

			const err = await e.promise;
			expect(err).toBeInstanceOf(Error);
			expect(err.message).toBe('`nonExistentOption` is not a supported option');
			/* eslint-enable jest/no-try-expect, jest/no-conditional-expect */
		}

		expect(didThrow).toBeTrue();
	});
});

async function expectSameResultAsAsync(options) {
	const syncRes = minifySync(inputCode, options);
	const asyncRes = await minify(inputCode, options);
	expect(syncRes).toEqual(asyncRes);
	return syncRes;
}
