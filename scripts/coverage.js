const { execSync } = require('child_process');
const { reporters: { Base } } = require('mocha');
const NYC = require('nyc');


module.exports = function(runner, options = {}) {
	Base.call(this, runner, options);

	runner.on('end', () => {
		const nyc = new NYC({ include: 'src/' });
		nyc.createTempDirectory();
		nyc.addAllFiles();
	});
};

if (require.main === module) {
	[
		'node_modules/.bin/gulp build-unit-tests --env=test --coverage',
		'node_modules/.bin/electron-mocha app/main.specs.js --require source-map-support/register --reporter scripts/coverage',
		'node_modules/.bin/electron-mocha app/renderer.specs.js --renderer --require source-map-support/register --reporter scripts/coverage',
	].forEach((cmd) => {
		console.log(`$ ${ cmd }`);
		execSync(cmd, { shell: true, stdio: 'inherit' });
	});

	const nyc = new NYC({
		include: 'src/',
		reporter: ['text-summary', 'html'],
		reportDir: 'coverage',
	});
	nyc.report();
	nyc.cleanup();
}
