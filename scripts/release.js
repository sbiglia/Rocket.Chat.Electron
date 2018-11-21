const { execSync } = require('child_process');
const minimist = require('minimist');
const { build } = require('electron-builder');


const builders = {
	darwin: async({ env, publish }) => {
		const { mac: { target } } = require('../electron-builder.json');
		const devTargets = target.map((target) => (target === 'mas' ? 'mas-dev' : target));

		await build({
			publish,
			x64: true,
			mac: env === 'production' ? [] : devTargets,
			c: env === 'production' ? {} : { mac: { provisioningProfile: 'Development.provisionprofile' } },
		});
	},

	linux: async({ publish }) => {
		const { linux: { target } } = require('../electron-builder.json');
		const allLinuxTargetsButSnap = target.filter((target) => target !== 'snap');

		await build({ publish, x64: true, linux: [], c: { productName: 'rocketchat' } });
		await build({ publish, ia32: true, linux: allLinuxTargetsButSnap, c: { productName: 'rocketchat' } });
	},

	win32: async({ publish }) => {
		await build({ publish, x64: true, ia32: true, win: ['nsis', 'appx'] });
	},
};

if (require.main === module) {
	const env = minimist(process.argv).env || 'development';

	[
		`gulp build-app --env=${ env }`,
	].forEach((cmd) => {
		console.log(`$ ${ cmd }`);
		execSync(cmd, { stdio: 'inherit' });
	});

	const publish = env === 'production' ? 'onTagOrDraft' : 'never';

	builders[process.platform]({ env, publish });
}
