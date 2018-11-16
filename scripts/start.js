const { spawn, execSync } = require('child_process');
const minimist = require('minimist');


if (require.main === module) {
	const env = minimist(process.argv).env || 'development';

	[
		`node_modules/.bin/gulp build-app --env=${ env }`,
	].forEach((cmd) => {
		console.log(`$ ${ cmd }`);
		execSync(cmd, { shell: true, stdio: 'inherit' });
	});

	[
		`node_modules/.bin/gulp watch --env=${ env }`,
		'node_modules/.bin/electron .',
	].forEach((cmd) => {
		console.log(`$ ${ cmd }`);
		const [executable, ...args] = cmd.split(' ');
		const subprocess = spawn(executable, args, { shell: true, stdio: 'inherit' });
		subprocess.on('close', (code) => process.exit(code));
		process.on('exit', () => subprocess.kill());
	});
}
