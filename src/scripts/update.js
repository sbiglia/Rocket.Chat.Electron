import { remote, ipcRenderer } from 'electron';
import i18n from '../i18n';
const { dialog, getCurrentWindow } = remote;


const setupI18n = () => {
	const { currentVersion, newVersion } = getCurrentWindow();

	document.title = i18n.__('Update_Available');
	document.querySelector('.update-title').innerHTML = i18n.__('Update_Available_New');
	document.querySelector('.update-message').innerHTML = i18n.__('Update_Available_message');
	document.querySelector('.current-version .app-version-label').innerHTML = i18n.__('Current_Version');
	document.querySelector('.new-version .app-version-label').innerHTML = i18n.__('New_Version');
	document.querySelector('.update-skip-action').innerHTML = i18n.__('Update_skip_version');
	document.querySelector('.update-remind-later-action').innerHTML = i18n.__('Update_skip_remind');
	document.querySelector('.update-install-action').innerHTML = i18n.__('Update_Install');

	document.querySelector('.current-version .app-version-value').innerHTML = currentVersion;
	document.querySelector('.new-version .app-version-value').innerHTML = newVersion;
};

export default () => {
	const { params: { newVersion } } = getCurrentWindow();

	window.addEventListener('load', () => {
		setupI18n();

		document.querySelector('.update-skip-action').addEventListener('click', (e) => {
			e.preventDefault();
			dialog.showMessageBox(getCurrentWindow(), {
				type: 'warning',
				title: i18n.__('Update_skip'),
				message: i18n.__('Update_skip_message'),
				buttons: [i18n.__('OK')],
				defaultId: 0,
			}, () => {
				ipcRenderer.send('close-update-dialog');
				ipcRenderer.send('skip-update-version', newVersion);
			});
		}, false);

		document.querySelector('.update-remind-later-action').addEventListener('click', (e) => {
			e.preventDefault();
			dialog.showMessageBox(getCurrentWindow(), {
				type: 'info',
				title: i18n.__('Update_remind'),
				message: i18n.__('Update_remind_message'),
				buttons: [i18n.__('OK')],
				defaultId: 0,
			}, () => {
				ipcRenderer.send('close-update-dialog');
				ipcRenderer.send('remind-update-later');
			});
		}, false);

		document.querySelector('.update-install-action').addEventListener('click', (e) => {
			e.preventDefault();
			dialog.showMessageBox(getCurrentWindow(), {
				type: 'info',
				title: i18n.__('Update_downloading'),
				message: i18n.__('Update_downloading_message'),
				buttons: [i18n.__('OK')],
				defaultId: 0,
			}, () => {
				ipcRenderer.send('close-update-dialog');
				ipcRenderer.send('download-update');
			});
		}, false);

		document.querySelector('.update-install-action').focus();

		getCurrentWindow().show();
	});
};
