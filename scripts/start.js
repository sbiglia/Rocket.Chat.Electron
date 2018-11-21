const { spawn, execSync } = require('child_process');
const minimist = require('minimist');


if (require.main === module) {
	const env = minimist(process.argv).env || 'development';

	[
		`gulp build-app --env=${ env }`,
	].forEach((cmd) => {
		console.log(`$ ${ cmd }`);
		execSync(cmd, { stdio: 'inherit' });
	});

	[
		`gulp watch --env=${ env }`,
		'electron .',
	].forEach((cmd) => {
		console.log(`$ ${ cmd }`);
		const [executable, ...args] = cmd.split(' ');
		const subprocess = spawn(executable, args, { stdio: 'inherit' });
		subprocess.on('close', (code) => process.exit(code));
		process.on('exit', () => subprocess.kill());
	});
}
