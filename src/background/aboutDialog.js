import { BrowserWindow, ipcMain } from 'electron';
import { getMainWindow } from './mainWindow';


let aboutWindow;

const openAboutDialog = async() => {
	if (aboutWindow) {
		aboutWindow.show();
		return;
	}

	const mainWindow = await getMainWindow();
	aboutWindow = new BrowserWindow({
		parent: mainWindow,
		modal: process.platform !== 'darwin',
		width: 480,
		height: 360,
		useContentSize: true,
		type: 'toolbar',
		resizable: false,
		fullscreenable: false,
		maximizable: false,
		minimizable: false,
		fullscreen: false,
		show: false,
	});
	aboutWindow.setMenuBarVisibility(false);

	aboutWindow.once('closed', () => {
		aboutWindow = null;
	});

	aboutWindow.loadFile(`${ __dirname }/public/about.html`);
};

const closeAboutDialog = () => {
	aboutWindow && aboutWindow.destroy();
};

ipcMain.on('open-about-dialog', () => openAboutDialog());
ipcMain.on('close-about-dialog', () => closeAboutDialog());
