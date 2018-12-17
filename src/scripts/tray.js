import { remote } from 'electron';
import { EventEmitter } from 'events';
import icon from './icon';
import i18n from '../i18n/index.js';
import { enqueue } from '../helpers';
const { Menu, Tray: TrayIcon } = remote;


const getIconStyle = ({ badge: { title, count }, status, showUserStatus }) => {
	const style = {
		template: process.platform === 'darwin',
		size: {
			darwin: 24,
			win32: [32, 24, 16],
			linux: 22,
		}[process.platform],
	};

	if (showUserStatus) {
		style.status = status;
	}

	if (process.platform !== 'darwin') {
		if (title === '•') {
			style.badgeText = '•';
		} else if (count > 0) {
			style.badgeText = count > 9 ? '9+' : String(count);
		} else if (title) {
			style.badgeText = '!';
		}
	}

	return style;
};

const getIconTitle = ({ badge: { title, count } }) => ((count > 0) ? title : '');

const getIconTooltip = ({ badge: { count } }) => i18n.pluralize('Message_count', count, count);

const createContextMenuTemplate = ({ isMainWindowVisible }, events) => ([
	{
		label: !isMainWindowVisible ? i18n.__('Show') : i18n.__('Hide'),
		click: () => events.emit('set-main-window-visibility', !isMainWindowVisible),
	},
	{
		label: i18n.__('Quit'),
		click: () => events.emit('quit'),
	},
]);


class Tray extends EventEmitter {
	constructor() {
		super();

		this.trayIcon = null;

		this.state = {
			badge: {
				title: '',
				count: 0,
			},
			status: 'online',
			isMainWindowVisible: true,
			showIcon: true,
			showUserStatus: true,
		};

		this.setState = enqueue(this.setState);
	}

	destroy() {
		this.destroyIcon();
		this.removeAllListeners();
	}

	createIcon(image) {
		if (this.trayIcon) {
			return;
		}

		this.trayIcon = new TrayIcon(image);

		this.trayIcon.on('click', () => this.emit('set-main-window-visibility', !this.state.isMainWindowVisible));
		this.trayIcon.on('right-click', (event, bounds) => this.trayIcon.popUpContextMenu(undefined, bounds));

		this.emit('created');
	}

	destroyIcon() {
		if (!this.trayIcon) {
			return;
		}

		this.trayIcon.destroy();
		this.trayIcon = null;

		this.emit('destroyed');
	}

	async update() {
		if (!this.state.showIcon) {
			this.destroyIcon();
			this.emit('update');
			return;
		}

		const image = await icon.render(getIconStyle(this.state));

		if (!this.trayIcon) {
			this.createIcon(image);
		} else {
			this.trayIcon.setImage(image);
		}

		this.trayIcon.setToolTip(getIconTooltip(this.state));

		if (process.platform === 'darwin') {
			this.trayIcon.setTitle(getIconTitle(this.state));
		}

		const template = createContextMenuTemplate(this.state, this);
		const menu = Menu.buildFromTemplate(template);
		this.trayIcon.setContextMenu(menu);

		this.emit('update');
	}

	async setState(partialState) {
		this.state = {
			...this.state,
			...partialState,
		};
		await this.update();
	}
}

export default new Tray;
