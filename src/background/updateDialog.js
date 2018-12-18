import { app, BrowserWindow, ipcMain } from 'electron';
import { getMainWindow } from './mainWindow';


let updateWindow;

const openUpdateDialog = async({ currentVersion = app.getVersion(), newVersion } = {}) => {
	if (updateWindow) {
		updateWindow.show();
		return;
	}

	const mainWindow = await getMainWindow();
	updateWindow = new BrowserWindow({
		parent: mainWindow,
		modal: process.platform !== 'darwin',
		width: 600,
		height: 330,
		type: 'toolbar',
		resizable: false,
		fullscreenable: false,
		maximizable: false,
		minimizable: false,
		fullscreen: false,
		show: false,
	});
	updateWindow.setMenuBarVisibility(false);

	updateWindow.once('closed', () => {
		updateWindow = null;
	});

	updateWindow.params = { currentVersion, newVersion };

	updateWindow.loadFile(`${ __dirname }/public/update.html`);
};

const closeUpdateDialog = () => {
	updateWindow.destroy();
};

ipcMain.on('open-update-dialog', (e, ...args) => openUpdateDialog(...args));
ipcMain.on('close-update-dialog', () => closeUpdateDialog());
