const gulp = require('gulp');
const batch = require('gulp-batch');
const plumber = require('gulp-plumber');
const watch = require('gulp-watch');
const webpack = require('webpack');


const bundle = async({ env = { [require('./utils').env]: true } } = {}) => {
	const config = require('../webpack.config')(env, process.argv);

	const bundling = webpack(config);

	const cb = (resolve, reject) => (err, stats) => {
		if (err) {
			reject(err);
			return;
		}

		console.log(stats.toString({ colors: true }));
		resolve(stats);
	};

	await new Promise((resolve, reject) => bundling.run(cb(resolve, reject)));
};

gulp.task('build-app', async() => {
	await bundle();
});

gulp.task('watch', () => {
	const run = (taskName) => batch((event, done) => gulp.start(taskName, done));
	watch('src/**/*.js', run('build-app'));
});

gulp.task('build-unit-tests', ['build-app'], async() => {
	await bundle({ env: { tests: true } });
});

gulp.task('build-coverage-tests', ['build-app'], async() => {
	await bundle({ env: { tests: true, coverage: true } });
});

gulp.task('build-e2e-tests', ['build-app'], async() => {
	await bundle({ env: { e2e: true } });
});
