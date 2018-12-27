import attachEvents from './events';
import servers from './servers';
import setupTouchBar from './touchBar';


export default () => {
	window.addEventListener('load', () => {
		servers.load();

		attachEvents();

		if (process.platform === 'darwin') {
			setupTouchBar();
		}
	});
};
