import { ipcRenderer, remote, shell } from 'electron';
import React from 'react';
import ReactDOM from 'react-dom';
import dock from './dock';
import menus from './menus';
import servers from './servers';
import tray from './tray';
import webview from './webview';
import Sidebar from '../components/Sidebar';
import { __ } from '../i18n';
const { app, dialog, getCurrentWindow } = remote;


let sidebar;


const initializeSidebar = () => {
	class SidebarContainer extends React.PureComponent {
		constructor(props) {
			super(props);
			this.state = {};
		}

		render() {
			return React.createElement(Sidebar, {
				...this.state,
				onReloadServer: ({ url }) => webview.getByUrl(url).reload(),
				onRemoveServer: ({ url }) => servers.remove({ url }),
				onOpenDevToolsForServer: ({ url }) => webview.getByUrl(url).openDevTools(),
				onAddServer: () => servers.clearActive(),
				onSortServers: (orderedUrls) => servers.sort(orderedUrls),
				onActivateServer: (host) => servers.setActive(host),
			});
		}
	}

	ReactDOM.render(React.createElement(SidebarContainer, { ref: (i) => { sidebar = i; } }), document.querySelector('.Sidebar'));

	sidebar.setState({
		hosts: servers.ordered,
		active: servers.active,
	});
};

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

	sidebar.setState({ visible: localStorage.getItem('sidebar-closed') !== 'true' });
	webview.adjustPadding(localStorage.getItem('sidebar-closed') !== 'true');
};

const updateServers = () => {
	menus.setState({
		servers: servers.ordered.map(({ title, url }) => ({ title, url })),
		currentServerUrl: servers.active,
	});

	sidebar.setState({
		hosts: servers.ordered,
		active: servers.active,
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
			ipcRenderer.send('clear-certificates');
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
				const previousValue = localStorage.getItem('sidebar-closed') !== 'true';
				const newValue = !previousValue;
				localStorage.setItem('sidebar-closed', JSON.stringify(!newValue));
				break;
			}
		}

		updatePreferences();
	});
};

const attachServersEvents = () => {
	servers.on('loaded', () => {
		if (servers.ordered.length === 1) {
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
		webview.showLanding();
		updateServers();
	});

	servers.on('active-setted', ({ url } = {}) => {
		webview.setActive(url);
		webview.getActive() && webview.getActive().send && webview.getActive().send('request-sidebar-color');
		updateServers();
	});

	servers.on('host-added', (host) => {
		servers.setActive(host);
		webview.add(host);
		updateServers();
	});

	servers.on('host-removed', (host) => {
		webview.remove(host.url);
		updateServers();
	});

	servers.on('sorted', () => {
		updateServers();
	});

	servers.on('title-setted', () => {
		updateServers();
	});
};

const attachTrayEvents = () => {
	const mainWindow = getCurrentWindow();
	tray.on('created', () => mainWindow.emit('set-state', { hideOnClose: true }));
	tray.on('destroyed', () => mainWindow.emit('set-state', { hideOnClose: false }));
	tray.on('set-main-window-visibility', (visible) => (visible ? mainWindow.show() : mainWindow.hide()));
	tray.on('quit', () => app.quit());
};

const attachWebviewEvents = () => {
	webview.on('ipc-message-unread-changed', (url, [badge]) => {
		sidebar.setState({ badges: { ...sidebar.state.badges, [url]: badge ? badge : null } });

		const { count, unread } = Object.values(sidebar.state.badges)
			.reduce(({ count, unread }, badge) => ({
				count: count + (isNaN(parseInt(badge, 10)) ? 0 : parseInt(badge, 10)),
				unread: unread || !!badge,
			}), { count: 0, unread: false });
		const globalBadge = { count, title: (count > 0 && String(count)) || (unread && '•') || null };
		tray.setState({ badge: globalBadge });
		dock.setState({ badge: globalBadge });

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

	webview.on('ipc-message-sidebar-background', (url, [{ color, background }]) => {
		sidebar.setState({
			colors: { ...sidebar.state.colors, [url]: color },
			backgrounds: { ...sidebar.state.backgrounds, [url]: background },
		});
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

	webview.on('dom-ready', () => {
		sidebar.setState({ visible: localStorage.getItem('sidebar-closed') !== 'true' });
		webview.adjustPadding(localStorage.getItem('sidebar-closed') !== 'true');
		webview.getActive() && webview.getActive().send && webview.getActive().send('request-sidebar-color');
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

	initializeSidebar();
	webview.initialize();

	window.addEventListener('focus', () => webview.focusActive());

	attachMenusEvents();
	attachServersEvents();
	attachTrayEvents();
	attachWebviewEvents();
	attachMainWindowEvents();

	updatePreferences();
	updateServers();
	updateWindowState();
};
