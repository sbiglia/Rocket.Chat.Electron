import { remote } from 'electron';
import { EventEmitter } from 'events';
import icon from './icon';
const { app, getCurrentWindow } = remote;


const getBadgeText = ({ badge: { title, count } }) => {
	if (title === '•') {
		return '•';
	} else if (count > 0) {
		return count > 99 ? '99+' : String(count);
	} else if (title) {
		return '!';
	}
};


class Dock extends EventEmitter {
	constructor() {
		super();

		this.state = {
			badge: {
				title: '',
				count: 0,
			},
			status: 'online',
		};
	}

	destroy() {
		this.removeAllListeners();
	}

	async update(previousState) {
		const mainWindow = getCurrentWindow();
		const badgeText = getBadgeText(this.state);

		if (process.platform === 'win32') {
			const image = badgeText ? await icon.render({
				overlay: true,
				size: 16,
				badgeText,
			}) : null;
			mainWindow.setOverlayIcon(image, badgeText || '');

			const update = this.update.bind(this);
			mainWindow.removeListener('show', update);
			mainWindow.on('show', update);
		}

		if (process.platform === 'darwin') {
			app.dock.setBadge(badgeText || '');
			if (this.state.badge.count > 0 && previousState.badge.count === 0) {
				app.dock.bounce();
			}
		}

		if (process.platform === 'linux') {
			const renderedIcon = await icon.render({
				badgeText,
				size: 128,
			});
			mainWindow.setIcon(renderedIcon);
		}

		if (!mainWindow.isFocused()) {
			mainWindow.flashFrame(this.state.badge.count > 0);
		}

		this.emit('update');
	}

	setState(partialState) {
		const previousState = this.state;
		this.state = {
			...this.state,
			...partialState,
		};

		this.update(previousState);
	}
}

export default new Dock;
