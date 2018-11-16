const { execSync } = require('child_process');


if (require.main === module) {
	[
		'node_modules/.bin/gulp build-unit-tests --env=test',
		'node_modules/.bin/electron-mocha app/main.specs.js --require source-map-support/register',
		'node_modules/.bin/electron-mocha app/renderer.specs.js --renderer --require source-map-support/register',
	].forEach((cmd) => {
		console.log(`$ ${ cmd }`);
		execSync(cmd, { shell: true, stdio: 'inherit' });
	});
}
