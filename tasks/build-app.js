const gulp = require('gulp');
const batch = require('gulp-batch');
const file = require('gulp-file');
const less = require('gulp-less');
const plumber = require('gulp-plumber');
const watch = require('gulp-watch');
const minimist = require('minimist');
const bundle = require('./bundle');


const { env, coverage } = minimist(process.argv, { default: { env: 'development', coverage: true } });

gulp.task('public', () => gulp.src('src/public/**/*')
	.pipe(plumber())
	.pipe(gulp.dest('app/public')));

gulp.task('i18n', () => gulp.src('src/i18n/lang/**/*')
	.pipe(plumber())
	.pipe(gulp.dest('app/i18n/lang')));

gulp.task('bundle', () => Promise.all([
	bundle('src/background.js', 'app/background.js', { env, coverage }),
	bundle('src/app.js', 'app/app.js', { env, coverage }),
	bundle('src/i18n/index.js', 'app/i18n/index.js', { env, coverage }),
]));

gulp.task('less', () => gulp.src('src/stylesheets/main.less')
	.pipe(plumber())
	.pipe(less())
	.pipe(gulp.dest('app/stylesheets')));

gulp.task('environment', () => file('env.json', JSON.stringify({ name: env }), { src: true })
	.pipe(plumber())
	.pipe(gulp.dest('app')));

gulp.task('build-app', ['public', 'i18n', 'bundle', 'less', 'environment']);

gulp.task('watch', () => {
	const run = (taskName) => batch((event, done) => gulp.start(taskName, done));

	watch('src/public/**/*', run('public'));
	watch('src/i18n/lang/**/*', run('i18n'));
	watch('src/**/*.js', run('bundle'));
	watch('src/**/*.less', run('less'));
});
