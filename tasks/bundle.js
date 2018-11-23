const path = require('path');
const builtinModules = require('builtin-modules');
const { rollup } = require('rollup');
const appManifest = require('../package.json');


const externalModules = [
	...builtinModules,
	...Object.keys(appManifest.dependencies),
	...Object.keys(appManifest.devDependencies),
];

const cachedModules = {};

module.exports = async(src, dest, { coverage = false } = {}) => {
	const inputOptions = {
		input: src,
		external: externalModules,
		cache: cachedModules[src],
		plugins: [
			require('rollup-plugin-json')(),
			coverage && require('rollup-plugin-istanbul')({
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
