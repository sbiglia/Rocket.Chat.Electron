import { ipcRenderer, desktopCapturer, remote } from 'electron';
import i18n from '../i18n';
const { getCurrentWindow } = remote;


const setupI18n = () => {
	document.title = i18n.__('Share_Your_Screen');
	document.querySelector('.screenshare-title').innerHTML = i18n.__('Select_a_screen_to_share');
};

const updateScreens = () => {
	const template = document.querySelector('.screenshare-source-template');

	desktopCapturer.getSources({ types: ['window', 'screen'] }, (error, sources) => {
		if (error) {
			throw error;
		}

		document.querySelector('.screenshare-sources').innerHTML = '';

		sources.forEach(({ id, name, thumbnail }) => {
			const sourceView = document.importNode(template.content, true);

			sourceView.querySelector('.screenshare-source-thumbnail img').setAttribute('alt', name);
			sourceView.querySelector('.screenshare-source-thumbnail img').setAttribute('src', thumbnail.toDataURL());
			sourceView.querySelector('.screenshare-source-name').textContent = name;

			sourceView.querySelector('.screenshare-source').addEventListener('click', (e) => {
				e.preventDefault();
				ipcRenderer.send('select-screenshare-source', id);
				window.close();
			}, false);

			document.querySelector('.screenshare-sources').appendChild(sourceView);
		});
	});

	setTimeout(() => requestAnimationFrame(updateScreens), 1000);
};

export default () => {
	window.addEventListener('load', () => {
		setupI18n();
		requestAnimationFrame(updateScreens);

		getCurrentWindow().show();
	});
};
