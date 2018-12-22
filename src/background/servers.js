import { app, ipcMain } from 'electron';
import jetpack from 'fs-jetpack';

class Servers {
	constructor() {
		this.servers = {};

		app.on('login', this.handleLogin.bind(this));

		ipcMain.on('update-servers', (event, servers) => {
			event.returnValue = this.update(servers);
		});

		ipcMain.on('get-default-servers', (event) => {
			event.returnValue = this.getDefaultServers();
		});
	}

	handleLogin(event, webContents, request, authInfo, callback) {
		Object.entries(this.servers)
			.filter(([url, { username }]) => (request.url.indexOf(url) === 0 && username))
			.forEach(([, { username, password }]) => callback(username, password));
	}

	update(servers) {
		this.servers = servers;
	}

	getDefaultServers() {
		const userDir = jetpack.cwd(app.getPath('userData'));
		const appDir = jetpack.cwd(jetpack.path(app.getAppPath(), app.getAppPath().endsWith('.asar') ? '..' : '.'));
		const path = (userDir.find({ matching: 'servers.json', recursive: false })[0] && userDir.path('servers.json')) ||
			(appDir.find({ matching: 'servers.json', recursive: false })[0] && appDir.path('servers.json'));

		if (!path) {
			return {};
		}

		try {
			const defaultServers = jetpack.read(path, 'json');
			if (!defaultServers) {
				return {};
			}

			return Object.entries(defaultServers)
				.reduce((hosts, [title, url]) => ({ ...hosts, [url]: { title, url } }), {});
		} catch (error) {
			console.error(`Failed to read servers.json file: ${ error }`);
			return {};
		}
	}
}

export default new Servers;
