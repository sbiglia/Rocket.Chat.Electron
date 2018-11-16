const path = require('path');
const { rollup } = require('rollup');
const appManifest = require('../package.json');
const builtinModules = require('builtin-modules');


const externalModules = [
	...builtinModules,
	...Object.keys(appManifest.dependencies),
	...Object.keys(appManifest.devDependencies),
];

const cachedModules = {};

module.exports = async(src, dest, { rollupPlugins = [] } = {}) => {
	const inputOptions = {
		input: src,
		external: externalModules,
		cache: cachedModules[src],
		plugins: [
			...rollupPlugins,
			require('rollup-plugin-json')(),
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
