const { execSync } = require('child_process');


if (require.main === module) {
	[
		'gulp build-unit-tests --env=test',
		'electron-mocha app/main.specs.js --require source-map-support/register',
		'electron-mocha app/renderer.specs.js --renderer --require source-map-support/register',
	].forEach((cmd) => {
		console.log(`$ ${ cmd }`);
		execSync(cmd, { stdio: 'inherit' });
	});
}
