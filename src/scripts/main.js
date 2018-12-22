import { ipcRenderer } from 'electron';
import attachEvents from './events';
import servers from './servers';
import sidebar from './sidebar';
import setupTouchBar from './touchBar';
import webview from './webview';
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

			if (servers.add(url).length > 0) {
				sidebar.show();
				servers.setActive({ url });
			}

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

export default () => {
	setupI18n();
	attachConnectionStateEvents();
	attachRegisterFormEvents();

	window.addEventListener('load', () => {
		servers.load();
		webview.initialize();
		sidebar.initialize();

		attachEvents();

		if (process.platform === 'darwin') {
			setupTouchBar();
		}
	});
};
