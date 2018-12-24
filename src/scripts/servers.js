import { ipcRenderer, remote } from 'electron';
import { EventEmitter } from 'events';
import querystring from 'querystring';
import url from 'url';


class Servers extends EventEmitter {
	constructor() {
		super();

		this.hosts = {};
		this.active = null;

		ipcRenderer.on('add-host', this.handleAddHost.bind(this));
	}

	handleAddHost(event, ...urls) {
		this.parseUrls(urls)
			.forEach(async(host) => {
				if (this.hosts[host.url]) {
					this.setActive(host);
					return;
				}

				if (!await this.validate(host)) {
					this.emit('host-rejected', host);
					return;
				}

				this.confirmNew(host);
			});
	}

	confirmNew(host) {
		this.emit('host-requested', host, (accepted) => {
			if (!accepted) {
				return;
			}

			this.hosts = { ...this.hosts, [host.url]: host };
			this.persist();
			this.emit('host-added', host);
		});
	}

	add(...urls) {
		return this.parseUrls(urls)
			.forEach((host) => {
				if (this.hosts[host.url]) {
					return;
				}

				this.hosts = { ...this.hosts, [host.url]: host };
				this.persist();
				this.emit('host-added', host);
			});
	}

	parseUrls(urls) {
		return urls.map((ref) => {
			const parsed = url.parse(ref.replace(/\/$/, ''));

			if (parsed.protocol) {
				return parsed;
			}

			const isDomain = (ref === 'localhost' || ref.indexOf('.') > -1);
			return url.parse(isDomain ? `https://${ ref }` : `https://${ ref }.rocket.chat`);
		})
			.filter(({ protocol }) => ['rocketchat:', 'http:', 'https:'].includes(protocol))
			.map(({ protocol, auth, host, pathname, query }) => {
				if (protocol === 'rocketchat:') {
					const { insecure } = querystring.parse(query);
					protocol = insecure ? 'http:' : 'https:';
				}

				auth = /^([^:]+?):(.+)$/.exec(auth);
				const [, username, password] = auth || [];
				auth = (username && password && `${ username }:${ password }@`) ||
					(username && `${ username }@`) ||
					'';

				return {
					title: `${ protocol }//${ host }${ pathname || '' }`,
					url: `${ protocol }//${ host }${ pathname || '' }`,
					authUrl: `${ protocol }//${ auth }${ host }${ pathname || '' }`,
					username,
					password,
				};
			});
	}

	async validate({ url }, timeout = 5000) {
		try {
			const response = await Promise.race([
				fetch(`${ url }/api/info`),
				new Promise((resolve, reject) => setTimeout(() => reject('timeout'), timeout)),
			]);

			return response.ok;
		} catch (error) {
			console.error(`Failed to fetch ${ url }: ${ error }`);
			return false;
		}
	}

	update({ url, ...props }) {
		if (!this.hosts[url]) {
			return;
		}

		const host = { ...this.hosts[url], url, ...props };

		if (host.url === 'https://open.rocket.chat/') {
			host.title = 'Rocket.Chat';
		} else if (host.url === 'https://unstable.rocket.chat/') {
			host.title = 'Rocket.Chat (unstable)';
		} else if (host.title === 'Rocket.Chat' && host.url !== 'https://open.rocket.chat/') {
			host.title = `${ host.title } - ${ host.url }`;
		}

		this.hosts = { ...this.hosts, [host.url]: host };
		this.persist();
		this.emit('title-setted', host);
	}

	remove({ url }) {
		const { [url]: host, ...hosts } = this.hosts;

		if (!host) {
			return;
		}

		this.hosts = hosts;
		this.persist();
		this.emit('host-removed', host);

		if (this.active === host.url) {
			this.clearActive();
		}

		remote.getCurrentWebContents().session.clearStorageData({
			origin: host.url,
		});
	}

	get ordered() {
		const hosts = Object.values(this.hosts);
		return hosts.sort(({ order: a = hosts.length }, { order: b = hosts.length }) => a - b);
	}

	sort(orderedUrls) {
		if (!Array.isArray(orderedUrls)) {
			return;
		}

		orderedUrls.forEach((url, i) => {
			this.hosts[url].order = i;
		});

		this.persist();
		this.emit('sorted', this.ordered);
	}

	persist() {
		localStorage.setItem('rocket.chat.hosts', JSON.stringify(this.hosts));

		if (this.active) {
			localStorage.setItem('rocket.chat.currentHost', this.active);
		} else {
			localStorage.removeItem('rocket.chat.currentHost');
		}

		localStorage.setItem('rocket.chat.sortOrder', JSON.stringify(this.ordered.map(({ url }) => url)));

		ipcRenderer.sendSync('update-servers', this.hosts);
	}

	load() {
		try {
			this.hosts = JSON.parse(localStorage.getItem('rocket.chat.hosts'));
		} catch (error) {
			this.hosts = {};
		}

		if (typeof this.hosts === 'string') {
			this.hosts = this.parseUrls([this.hosts]);
		}

		if (Array.isArray(this.hosts)) {
			this.hosts = this.hosts.reduce((hosts, url) => {
				const [host] = this.parseUrls([url]);
				return ({ ...hosts, [host.url]: host });
			}, {});
		}

		if (Object.values(this.hosts).length === 0) {
			this.hosts = ipcRenderer.sendSync('get-default-servers');
		}

		for (const [url, host] of Object.entries(this.hosts)) {
			if (url !== host.url) {
				delete this.hosts[url];
				this.hosts[host.url] = host;
			}
		}

		try {
			const orderedUrls = JSON.parse(localStorage.getItem('rocket.chat.sortOrder'));
			Array.isArray(orderedUrls) && orderedUrls.forEach((url, i) => {
				this.hosts[url].order = i;
			});
		} catch (error) {
			for (const host of Object.values(this.hosts)) {
				delete host.order;
			}
		}

		this.ordered.forEach((host, i) => {
			host.order = i;
		});

		this.active = localStorage.getItem('rocket.chat.currentHost');

		if (!this.hosts[this.active]) {
			this.active = null;
		}

		this.persist();
		this.emit('loaded');
	}

	getActive() {
		return this.hosts[this.active];
	}

	setActive({ url }) {
		const host = this.hosts[url];
		this.active = host ? host.url : null;
		this.persist();

		if (host) {
			this.emit('active-setted', host);
		} else {
			this.emit('active-cleared');
		}
	}

	clearActive() {
		this.active = null;
		this.persist();

		this.emit('active-cleared');
	}
}


export default new Servers;
