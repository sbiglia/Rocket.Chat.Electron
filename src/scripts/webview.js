import { ipcRenderer } from 'electron';
import { EventEmitter } from 'events';
import servers from './servers';
import i18n from '../i18n/index.js';


const setupI18n = () => {
	document.querySelector('#login-card .connect__prompt').innerHTML = i18n.__('Enter_your_server_URL');
	document.querySelector('#login-card #invalidUrl').innerHTML = i18n.__('No_valid_server_found');
	document.querySelector('#login-card .connect__error').innerHTML = i18n.__('Check_connection');
	document.querySelector('#login-card .login').innerHTML = i18n.__('Connect');
};


const attachConnectionStateEvents = () => {
	const handleOnline = () => document.body.classList.remove('offline');
	const handleOffline = () => document.body.classList.add('offline');
	window.addEventListener('online', handleOnline);
	window.addEventListener('offline', handleOffline);
	navigator.onLine ? handleOnline() : handleOffline();
};


const attachRegisterFormEvents = () => {
	const defaultInstance = 'https://open.rocket.chat';

	const form = document.querySelector('form');
	const hostField = form.querySelector('[name="host"]');
	const button = form.querySelector('[type="submit"]');
	const invalidUrl = form.querySelector('#invalidUrl');

	window.addEventListener('load', () => hostField.focus());

	function validateHost() {
		return new Promise(function(resolve, reject) {
			const execValidation = function() {
				invalidUrl.style.display = 'none';
				hostField.classList.remove('wrong');

				const host = hostField.value.trim();
				hostField.value = host;

				if (host.length === 0) {
					button.value = i18n.__('Connect');
					button.disabled = false;
					resolve();
					return;
				}

				button.value = i18n.__('Validating');
				button.disabled = true;

				servers.validate({ url: host }, 2000).then(function() {
					button.value = i18n.__('Connect');
					button.disabled = false;
					resolve();
				}, function(status) {
					// If the url begins with HTTP, mark as invalid
					if (/^https?:\/\/.+/.test(host) || status === 'basic-auth') {
						button.value = i18n.__('Invalid_url');
						invalidUrl.style.display = 'block';
						switch (status) {
							case 'basic-auth':
								invalidUrl.innerHTML = i18n.__('Auth_needed_try', '<b>username:password@host</b>');
								break;
							case 'invalid':
								invalidUrl.innerHTML = i18n.__('No_valid_server_found');
								break;
							case 'timeout':
								invalidUrl.innerHTML = i18n.__('Timeout_trying_to_connect');
								break;
						}
						hostField.classList.add('wrong');
						reject();
						return;
					}

					// // If the url begins with HTTPS, fallback to HTTP
					// if (/^https:\/\/.+/.test(host)) {
					//     hostField.value = host.replace('https://', 'http://');
					//     return execValidation();
					// }

					// If the url isn't localhost, don't have dots and don't have protocol
					// try as a .rocket.chat subdomain
					if (!/(^https?:\/\/)|(\.)|(^([^:]+:[^@]+@)?localhost(:\d+)?$)/.test(host)) {
						hostField.value = `https://${ host }.rocket.chat`;
						return execValidation();
					}

					// If the url don't start with protocol try HTTPS
					if (!/^https?:\/\//.test(host)) {
						hostField.value = `https://${ host }`;
						return execValidation();
					}
				});
			};
			execValidation();
		});
	}

	hostField.addEventListener('blur', function() {
		validateHost().then(function() {}, function() {});
	});

	ipcRenderer.on('certificate-reload', function(event, url) {
		hostField.value = url.replace(/\/api\/info$/, '');
		validateHost().then(function() {}, function() {});
	});

	const submit = function() {
		validateHost().then(function() {
			const input = form.querySelector('[name="host"]');
			let url = input.value;

			if (url.length === 0) {
				url = defaultInstance;
			}

			servers.add(url);

			input.value = '';
		}, function() {});
	};

	hostField.addEventListener('keydown', function(ev) {
		if (ev.which === 13) {
			ev.preventDefault();
			ev.stopPropagation();
			submit();
			return false;
		}
	});

	form.addEventListener('submit', function(ev) {
		ev.preventDefault();
		ev.stopPropagation();
		submit();
		return false;
	});
};


class WebView extends EventEmitter {
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

	saveLastPath(url, lastPath) {
		servers.update({ url, lastPath });
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
		document.querySelector('.landing').classList.add('hide');
	}

	showLanding() {
		this.loaded();
		document.querySelector('.landing').classList.remove('hide');
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
		setupI18n();
		attachConnectionStateEvents();
		attachRegisterFormEvents();

		this.webviewParentElement = document.querySelector('.MainView');

		servers.ordered.forEach((host) => {
			this.add(host);
		});

		if (servers.active) {
			this.setActive(servers.active);
		} else {
			this.showLanding();
		}

		ipcRenderer.on('screenshare-result', (e, id) => {
			const webviewObj = this.getActive();
			webviewObj.executeJavaScript(`
				window.parent.postMessage({ sourceId: '${ id }' }, '*');
			`);
		});
	}

	adjustPadding(withSidebar = true) {
		if (process.platform !== 'darwin') {
			return;
		}

		document.querySelectorAll('webview').forEach((webviewObj) => {
			webviewObj.insertCSS(`
			aside.side-nav {
				margin-top: ${ withSidebar ? '0' : '15px' };
				overflow: hidden;
				transition: margin .5s ease-in-out;
			}
			.sidebar {
				padding-top: ${ withSidebar ? '0' : '10px' };
				transition: margin .5s ease-in-out;
			}`);
		});
	}
}


export default new WebView;
