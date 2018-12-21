import { app, ipcMain, Menu } from 'electron';
import querystring from 'querystring';
import url from 'url';
import idle from '@paulcbetts/system-idle-time';
import './background/aboutDialog';
import appData from './background/appData';
import certificate from './background/certificate';
import { addServer, getMainWindow } from './background/mainWindow';
import './background/notifications';
import './background/screenshareDialog';
import './background/updateDialog';
import './background/servers';
import './background/updates';
import i18n from './i18n/index.js';
export { certificate };


process.env.GOOGLE_API_KEY = 'AIzaSyADqUh_c1Qhji3Cp1NE43YrcpuPkmhXD-c';

const unsetDefaultApplicationMenu = () => {
	if (process.platform !== 'darwin') {
		Menu.setApplicationMenu(null);
		return;
	}

	const emptyMenuTemplate = [{
		submenu: [
			{
				label: i18n.__('&Quit %s', app.getName()),
				accelerator: 'CommandOrControl+Q',
				click() {
					app.quit();
				},
			},
		],
	}];
	Menu.setApplicationMenu(Menu.buildFromTemplate(emptyMenuTemplate));
};

const parseProtocolUrls = (args) =>
	args.filter((arg) => /^rocketchat:\/\/./.test(arg))
		.map((uri) => url.parse(uri))
		.map(({ hostname, pathname, query }) => {
			const { insecure } = querystring.parse(query);
			return `${ insecure === 'true' ? 'http' : 'https' }://${ hostname }${ pathname || '' }`;
		});

const addServers = async(protocolUrls) => {
	parseProtocolUrls(protocolUrls).forEach((serverUrl) => addServer(serverUrl));
};

// macOS only
app.on('open-url', (event, url) => {
	event.preventDefault();
	addServers([url]);
});

app.on('window-all-closed', () => {
	app.quit();
});

if (!app.isDefaultProtocolClient('rocketchat')) {
	app.setAsDefaultProtocolClient('rocketchat');
}

app.setAppUserModelId('chat.rocket');
if (process.platform === 'linux') {
	app.disableHardwareAcceleration();
}

ipcMain.on('getSystemIdleTime', (event) => {
	event.returnValue = idle.getIdleTime();
});

ipcMain.on('log', (event, ...args) => {
	console.log.apply(console, args);
});

process.on('unhandledRejection', console.error.bind(console));


const gotTheLock = app.requestSingleInstanceLock();

if (gotTheLock) {
	app.on('second-instance', async(event, argv) => {
		addServers(argv.slice(2));
	});

	app.on('ready', async() => {
		unsetDefaultApplicationMenu();

		appData.initialize();

		const mainWindow = await getMainWindow();
		certificate.initWindow(mainWindow);

		ipcMain.emit('check-for-updates');
	});
} else {
	app.quit();
}
