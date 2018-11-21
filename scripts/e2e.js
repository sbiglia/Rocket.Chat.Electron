const { execSync } = require('child_process');


if (require.main === module) {
	[
		'gulp build-e2e-tests --env=test',
		'mocha app/e2e.specs.js --require source-map-support/register',
	].forEach((cmd) => {
		console.log(`$ ${ cmd }`);
		execSync(cmd, { stdio: 'inherit' });
	});
}
