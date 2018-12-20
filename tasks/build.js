const gulp = require('gulp');
const batch = require('gulp-batch');
const less = require('gulp-less');
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

gulp.task('public', () => gulp.src('src/public/**/*')
	.pipe(plumber())
	.pipe(gulp.dest('app/public')));

gulp.task('i18n', () => gulp.src('src/i18n/lang/**/*')
	.pipe(plumber())
	.pipe(gulp.dest('app/i18n/lang')));

gulp.task('bundle', async() => {
	await bundle();
});

gulp.task('less', () => gulp.src('src/stylesheets/main.less')
	.pipe(plumber())
	.pipe(less())
	.pipe(gulp.dest('app/stylesheets')));

gulp.task('build-app', ['public', 'i18n', 'bundle', 'less']);

gulp.task('watch', () => {
	const run = (taskName) => batch((event, done) => gulp.start(taskName, done));

	watch('src/public/**/*', run('public'));
	watch('src/i18n/lang/**/*', run('i18n'));
	watch('src/**/*.js', run('bundle'));
	watch('src/**/*.less', run('less'));
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
