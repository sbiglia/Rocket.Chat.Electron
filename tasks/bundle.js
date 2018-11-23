const path = require('path');
const builtinModules = require('builtin-modules');
const appManifest = require('../package.json');
const { rollup } = require('rollup');
const istanbul = require('rollup-plugin-istanbul');
const json = require('rollup-plugin-json');
const memory = require('rollup-plugin-memory');


const externalModules = [
	...builtinModules,
	...Object.keys(appManifest.dependencies),
	...Object.keys(appManifest.devDependencies),
];

const cachedModules = {};

module.exports = async(src, dest, { env = 'development', coverage = false } = {}) => {
	const inputOptions = {
		input: src,
		external: externalModules,
		cache: cachedModules[src],
		plugins: [
			json(),
			src.path && src.contents && memory(),
			coverage && istanbul({
				exclude: ['**/*.spec.js', '**/*.specs.js'],
			}),
		],
	};

	const outputOptions = {
		format: 'cjs',
		file: dest,
		intro: '(function () {',
		outro: '})()',
		sourcemap: true,
		sourcemapFile: path.basename(dest),
	};

	cachedModules[src] = await rollup(inputOptions);
	await cachedModules[src].write(outputOptions);
};
