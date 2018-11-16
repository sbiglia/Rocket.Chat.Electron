const gulp = require('gulp');
const jetpack = require('fs-jetpack');
const minimist = require('minimist');
const bundle = require('./bundle');


const createEntryFile = async(srcDir, matching, outputDir, entryFileName) => {
	const entryFileContent = srcDir.find('.', { matching })
		.map((path) => `import './${ path.replace(/\\/g, '/') }';`)
		.join('\n');

	srcDir.write(entryFileName, entryFileContent);

	await bundle(srcDir.path(entryFileName), outputDir.path(entryFileName), { coverage: minimist(process.argv).coverage });

	srcDir.remove(entryFileName);
};

gulp.task('build-unit-tests', ['build-app'], () => Promise.all([
	createEntryFile(jetpack.cwd('src'), 'background/*.spec.js', jetpack.cwd('app'), 'main.specs.js'),
	createEntryFile(jetpack.cwd('src'), ['*.spec.js', '!background/*.spec.js'], jetpack.cwd('app'), 'renderer.specs.js'),
]));

gulp.task('build-e2e-tests', ['build-app'], () => createEntryFile(
	jetpack.cwd('src'), '*.e2e.js',
	jetpack.cwd('app'), 'e2e.specs.js'
));
