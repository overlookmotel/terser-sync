/* --------------------
 * terser-sync module
 * Tests
 * ------------------*/

'use strict';

// Modules
const terserSync = require('terser-sync');

// Init
require('./support/index.js');

// Tests

describe('tests', () => {
	it.skip('all', () => { // eslint-disable-line jest/no-disabled-tests
		expect(terserSync).not.toBeUndefined();
	});
});
