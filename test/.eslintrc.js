/* --------------------
 * terser-sync module
 * Tests ESLint config
 * ------------------*/

'use strict';

// Exports

module.exports = {
	extends: [
		'@overlookmotel/eslint-config-jest'
	],
	rules: {
		'import/no-unresolved': ['error', {ignore: ['^terser-sync$']}],
		'jest/expect-expect': ['error', {assertFunctionNames: ['expect', 'expectSameResultAsAsync']}]
	}
};
