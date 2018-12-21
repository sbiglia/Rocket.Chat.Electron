import { app, ipcMain } from 'electron';


class Servers {
	constructor() {
		this.servers = {};

		app.on('login', this.handleLogin.bind(this));
		ipcMain.on('update-servers', (event, servers) => {
			event.returnValue = this.update(servers);
		});
	}

	update(servers) {
		this.servers = servers;
	}

	handleLogin(event, webContents, request, authInfo, callback) {
		Object.entries(this.servers)
			.filter(([url, { username }]) => (request.url.indexOf(url) === 0 && username))
			.forEach(([, { username, password }]) => callback(username, password));
	}
}

export default new Servers;
