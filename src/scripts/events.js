import { ipcRenderer, remote, shell } from 'electron';
import dock from './dock';
import menus from './menus';
import servers from './servers';
import sidebar from './sidebar';
import tray from './tray';
import webview from './webview';
import { __ } from '../i18n';
const { app, dialog, getCurrentWindow } = remote;
const { certificate } = remote.require('./background');


const updatePreferences = () => {
	const mainWindow = getCurrentWindow();

	menus.setState({
		showTrayIcon: localStorage.getItem('hideTray') ?
			localStorage.getItem('hideTray') !== 'true' : (process.platform !== 'linux'),
		showUserStatusInTray: (localStorage.getItem('showUserStatusInTray') || 'true') === 'true',
		showFullScreen: mainWindow.isFullScreen(),
		showWindowOnUnreadChanged: localStorage.getItem('showWindowOnUnreadChanged') === 'true',
		showMenuBar: localStorage.getItem('autohideMenu') !== 'true',
		showServerList: localStorage.getItem('sidebar-closed') !== 'true',
	});

	tray.setState({
		showIcon: localStorage.getItem('hideTray') ?
			localStorage.getItem('hideTray') !== 'true' : (process.platform !== 'linux'),
		showUserStatus: (localStorage.getItem('showUserStatusInTray') || 'true') === 'true',
	});
};

const updateServers = () => {
	menus.setState({
		servers: Object.values(servers.hosts)
			.sort((a, b) => (sidebar ? (sidebar.sortOrder.indexOf(a.url) - sidebar.sortOrder.indexOf(b.url)) : 0))
			.map(({ title, url }) => ({ title, url })),
		currentServerUrl: servers.active,
	});
};

const updateWindowState = () => tray.setState({ isMainWindowVisible: getCurrentWindow().isVisible() });

const attachMenusEvents = () => {
	menus.on('quit', () => app.quit());
	menus.on('about', () => ipcRenderer.send('open-about-dialog'));
	menus.on('open-url', (url) => shell.openExternal(url));

	menus.on('add-new-server', () => {
		const mainWindow = getCurrentWindow();
		mainWindow.show();
		servers.clearActive();
	});

	menus.on('select-server', ({ url }) => {
		const mainWindow = getCurrentWindow();
		mainWindow.show();
		servers.setActive({ url });
	});

	menus.on('reload-server', ({ ignoringCache = false, clearCertificates = false } = {}) => {
		if (clearCertificates) {
			certificate.clear();
		}

		const activeWebview = webview.getActive();
		if (!activeWebview) {
			return;
		}

		if (ignoringCache) {
			activeWebview.reloadIgnoringCache();
			return;
		}

		activeWebview.reload();
	});

	menus.on('open-devtools-for-server', () => {
		const activeWebview = webview.getActive();
		if (activeWebview) {
			activeWebview.openDevTools();
		}
	});

	menus.on('go-back', () => webview.goBack());
	menus.on('go-forward', () => webview.goForward());

	menus.on('reload-app', () => {
		const mainWindow = getCurrentWindow();
		mainWindow.reload();
	});

	menus.on('toggle-devtools', () => {
		const mainWindow = getCurrentWindow();
		mainWindow.toggleDevTools();
	});

	menus.on('reset-app-data', () => {
		dialog.showMessageBox({
			type: 'question',
			buttons: ['Yes', 'Cancel'],
			defaultId: 1,
			title: __('Reset app data'),
			message: __('This will sign you out from all your teams and reset the app back to its original settings. ' +
				'This cannot be undone.'),
		}, (response) => {
			if (response !== 0) {
				return;
			}

			ipcRenderer.send('reset-app-data');
		});
	});

	menus.on('toggle', (property) => {
		switch (property) {
			case 'showTrayIcon': {
				const previousValue = localStorage.getItem('hideTray') !== 'true';
				const newValue = !previousValue;
				localStorage.setItem('hideTray', JSON.stringify(!newValue));
				break;
			}

			case 'showUserStatusInTray': {
				const previousValue = (localStorage.getItem('showUserStatusInTray') || 'true') === 'true';
				const newValue = !previousValue;
				localStorage.setItem('showUserStatusInTray', JSON.stringify(newValue));
				break;
			}

			case 'showFullScreen': {
				const mainWindow = getCurrentWindow();
				mainWindow.setFullScreen(!mainWindow.isFullScreen());
				break;
			}

			case 'showWindowOnUnreadChanged': {
				const previousValue = localStorage.getItem('showWindowOnUnreadChanged') === 'true';
				const newValue = !previousValue;
				localStorage.setItem('showWindowOnUnreadChanged', JSON.stringify(newValue));
				break;
			}

			case 'showMenuBar': {
				const previousValue = localStorage.getItem('autohideMenu') !== 'true';
				const newValue = !previousValue;
				localStorage.setItem('autohideMenu', JSON.stringify(!newValue));
				break;
			}

			case 'showServerList': {
				sidebar.toggle();
				break;
			}
		}

		updatePreferences();
	});
};

const attachServersEvents = () => {
	servers.on('loaded', () => {
		if (Object.keys(servers.hosts).length === 1) {
			localStorage.setItem('sidebar-closed', 'true');
		}

		webview.loaded();
		updateServers();
	});

	servers.on('host-rejected', (host) => {
		dialog.showErrorBox(__('Invalid_Host'), __('Host_not_validated', host.url));
	});

	servers.on('host-requested', (host, cb) => {
		dialog.showMessageBox({
			title: __('Add_Server'),
			message: __('Add_host_to_servers', host.url),
			type: 'question',
			buttons: [__('Add'), __('Cancel')],
			defaultId: 0,
		}, (response) => cb(response === 0));
	});

	servers.on('active-cleared', () => {
		webview.deactiveAll();
		sidebar.deactiveAll();
		sidebar.changeSidebarColor({});
		webview.showLanding();
		updateServers();
	});

	servers.on('active-setted', ({ url } = {}) => {
		webview.setActive(url);
		sidebar.setActive(url);

		webview.getActive() && webview.getActive().send && webview.getActive().send('request-sidebar-color');

		updateServers();
	});

	servers.on('host-added', (host) => {
		webview.add(host);
		sidebar.add(host);
		sidebar.setActive(host.url);
		webview.setActive(host.url);
		updateServers();
	});

	servers.on('host-removed', (host) => {
		webview.remove(host.url);
		sidebar.remove(host.url);
		updateServers();
	});

	servers.on('title-setted', (host) => {
		sidebar.setLabel(host.url, host.title);
		updateServers();
	});
};

const attachSidebarEvents = () => {
	sidebar.on('add-server', () => {
		servers.clearActive();
	});

	sidebar.on('servers-sorted', updateServers);

	sidebar.on('badge-setted', () => {
		const badge = sidebar.getGlobalBadge();
		tray.setState({ badge });
		dock.setState({ badge });
	});

	sidebar.on('reload-server', (hostUrl) => webview.getByUrl(hostUrl).reload());
	sidebar.on('remove-server', (hostUrl) => servers.remove({ url: hostUrl }));
	sidebar.on('open-devtools-for-server', (hostUrl) => webview.getByUrl(hostUrl).openDevTools());
};

const attachTrayEvents = () => {
	const mainWindow = getCurrentWindow();
	tray.on('created', () => mainWindow.emit('set-state', { hideOnClose: true }));
	tray.on('destroyed', () => mainWindow.emit('set-state', { hideOnClose: false }));
	tray.on('set-main-window-visibility', (visible) => (visible ? mainWindow.show() : mainWindow.hide()));
	tray.on('quit', () => app.quit());
};

const attachWebviewEvents = () => {
	webview.on('ipc-message-unread-changed', (hostUrl, [badge]) => {
		sidebar.setBadge(hostUrl, badge);

		if (typeof badge === 'number' && localStorage.getItem('showWindowOnUnreadChanged') === 'true') {
			const mainWindow = getCurrentWindow();
			if (!mainWindow.isFocused()) {
				mainWindow.once('focus', () => mainWindow.flashFrame(false));
				mainWindow.showInactive();
				mainWindow.flashFrame(true);
			}
		}
	});

	webview.on('ipc-message-user-status-manually-set', (hostUrl, [status]) => {
		tray.setState({ status });
		dock.setState({ status });
	});

	webview.on('ipc-message-sidebar-background', (hostUrl, [color]) => {
		sidebar.changeSidebarColor(color);
	});

	webview.on('ipc-message-title-changed', (url, [title]) => {
		servers.update({ url, title });
	});

	webview.on('ipc-message-focus', (url) => {
		servers.setActive({ url });
	});

	webview.on('ipc-message-get-sourceId', () => {
		ipcRenderer.send('open-screenshare-dialog');
	});

	webview.on('ipc-message-reload-server', () => {
		const active = webview.getActive();
		const server = active.getAttribute('server');
		webview.loading();
		active.loadURL(server);
	});

	webview.on('dom-ready', (hostUrl) => {
		sidebar.setImage(hostUrl);
		if (sidebar.isHidden()) {
			sidebar.hide();
		} else {
			sidebar.show();
		}
	});
};

const attachMainWindowEvents = () => {
	const mainWindow = getCurrentWindow();
	mainWindow.on('hide', updateWindowState);
	mainWindow.on('show', updateWindowState);
};

const destroyAll = () => {
	try {
		tray.destroy();
		menus.destroy();
		dock.destroy();
		const mainWindow = getCurrentWindow();
		mainWindow.removeListener('hide', updateWindowState);
		mainWindow.removeListener('show', updateWindowState);
	} catch (error) {
		ipcRenderer.send('log', error);
	}
};

export default () => {
	window.addEventListener('beforeunload', destroyAll);

	window.addEventListener('keydown', (e) => {
		if (e.key === 'Control' || e.key === 'Meta') {
			sidebar.setKeyboardShortcutsVisible(true);
		}
	});

	window.addEventListener('keyup', function(e) {
		if (e.key === 'Control' || e.key === 'Meta') {
			sidebar.setKeyboardShortcutsVisible(false);
		}
	});

	attachMenusEvents();
	attachServersEvents();
	attachSidebarEvents();
	attachTrayEvents();
	attachWebviewEvents();
	attachMainWindowEvents();

	updatePreferences();
	updateServers();
	updateWindowState();
};
