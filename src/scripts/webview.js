import { ipcRenderer } from 'electron';
import { EventEmitter } from 'events';
import servers from './servers';


class WebView extends EventEmitter {
	constructor() {
		super();
	}

	loaded() {
		document.querySelector('.app-page').classList.remove('app-page--loading');
	}

	loading() {
		document.querySelector('.app-page').classList.add('app-page--loading');
	}

	add(host) {
		let webviewObj = this.getByUrl(host.url);
		if (webviewObj) {
			return;
		}

		webviewObj = document.createElement('webview');
		webviewObj.setAttribute('server', host.url);
		webviewObj.setAttribute('preload', '../preload.js');
		webviewObj.setAttribute('allowpopups', 'on');
		webviewObj.setAttribute('disablewebsecurity', 'on');

		webviewObj.addEventListener('did-navigate-in-page', (lastPath) => {
			if ((lastPath.url).includes(host.url)) {
				this.saveLastPath(host.url, lastPath.url);
			}
		});

		webviewObj.addEventListener('console-message', (e) => {
			const { level, line, message, sourceId } = e;
			const levelFormatting = {
				[-1]: 'color: #999',
				0: 'color: #666',
				1: 'color: #990',
				2: 'color: #900',
			}[level];
			const danglingFormatting = (message.match(/%c/g) || []).map(() => '');
			console.log(`%c${ host.url }\t%c${ message }\n${ sourceId } : ${ line }`,
				'font-weight: bold', levelFormatting, ...danglingFormatting);
		});

		webviewObj.addEventListener('ipc-message', (event) => {
			this.emit(`ipc-message-${ event.channel }`, host.url, event.args);

			switch (event.channel) {
				case 'title-changed':
					servers.setHostTitle(host.url, event.args[0]);
					break;
				case 'focus':
					servers.setActive(host.url);
					break;
				case 'get-sourceId':
					ipcRenderer.send('open-screenshare-dialog');
					break;
				case 'reload-server':
					const active = this.getActive();
					const server = active.getAttribute('server');
					this.loading();
					active.loadURL(server);
					break;
			}
		});

		webviewObj.addEventListener('dom-ready', () => {
			this.emit('dom-ready', host.url);
		});

		webviewObj.addEventListener('did-fail-load', (e) => {
			if (e.isMainFrame) {
				webviewObj.loadURL(`file://${ __dirname }/loading-error.html`);
			}
		});

		webviewObj.addEventListener('did-get-response-details', (e) => {
			if (e.resourceType === 'mainFrame' && e.httpResponseCode >= 500) {
				webviewObj.loadURL(`file://${ __dirname }/loading-error.html`);
			}
		});

		this.webviewParentElement.appendChild(webviewObj);

		webviewObj.src = host.lastPath || host.url;
	}

	remove(hostUrl) {
		const el = this.getByUrl(hostUrl);
		if (el) {
			el.remove();
		}
	}

	saveLastPath(hostUrl, lastPathUrl) {
		const { hosts } = servers;
		hosts[hostUrl].lastPath = lastPathUrl;
		servers.hosts = hosts;
	}

	getByUrl(hostUrl) {
		return this.webviewParentElement.querySelector(`webview[server="${ hostUrl }"]`);
	}

	getActive() {
		return document.querySelector('webview.active');
	}

	isActive(hostUrl) {
		return !!this.webviewParentElement.querySelector(`webview.active[server="${ hostUrl }"]`);
	}

	deactiveAll() {
		let item;
		while (!(item = this.getActive()) === false) {
			item.classList.remove('active');
		}
		document.querySelector('.landing-page').classList.add('hide');
	}

	showLanding() {
		this.loaded();
		document.querySelector('.landing-page').classList.remove('hide');
	}

	setActive(hostUrl) {
		if (this.isActive(hostUrl)) {
			return;
		}

		this.deactiveAll();
		const item = this.getByUrl(hostUrl);
		if (item) {
			item.classList.add('active');
		}
		this.focusActive();
	}

	focusActive() {
		const active = this.getActive();
		if (active) {
			active.focus();
			return true;
		}
		return false;
	}

	goBack() {
		this.getActive().goBack();
	}

	goForward() {
		this.getActive().goForward();
	}

	initialize() {
		this.webviewParentElement = document.body;

		servers.forEach((host) => {
			this.add(host);
		});

		ipcRenderer.on('screenshare-result', (e, id) => {
			const webviewObj = this.getActive();
			webviewObj.executeJavaScript(`
				window.parent.postMessage({ sourceId: '${ id }' }, '*');
			`);
		});
	}
}


export default new WebView;
