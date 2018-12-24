import { remote } from 'electron';
import htm from 'htm';
import React from 'react';
import { __ } from '../i18n';
const { getCurrentWindow, Menu } = remote;
const html = htm.bind(React.createElement);


const createInitials = (title) => {
	let name = title.replace(/^https?:\/\/(?:www\.)?([^\/]+)(.*)/, '$1')
		.split('.');
	name = name[0][0] + (name[1] ? name[1][0] : '');
	return name.toUpperCase();
};


const Server = React.memo(({
	active,
	badge,
	faviconLoaded,
	hotkeyVisible,
	index,
	moving,
	title,
	url,
	onClick,
	onDragOver,
	onDragStart,
	onDragEnter,
	onDragEnd,
	onDrop,
	onContextMenu,
	onFaviconLoad,
}) => html`
<li
	className=${ ['ServerList__item', 'Server', active && 'Server--active', moving && 'Server--moving', badge && 'Server--unread'].filter(Boolean).join(' ') }
	draggable="true"
	data-tooltip=${ title }
	onClick=${ onClick }
	onDragOver=${ onDragOver }
	onDragStart=${ onDragStart }
	onDragEnter=${ onDragEnter }
	onDragEnd=${ onDragEnd }
	onDrop=${ onDrop }
	onContextMenu=${ onContextMenu }
>
	<span style=${ { display: faviconLoaded ? 'none' : '' } }>${ createInitials(title) }</span>
	<div className="Server__badge">${ badge }</div>
	<img
		style=${ { display: faviconLoaded ? 'initial' : '' } }
		src=${ `${ url.replace(/\/$/, '') }/assets/favicon.svg` }
		onLoad=${ onFaviconLoad }
	/>
	${ hotkeyVisible ? html`
		<div className="Server__hotkey">${ `${ process.platform === 'darwin' ? '⌘' : '^' }${ index }` }</div>
	` : null }
</li>
`);


const AddServer = React.memo(({ onClick }) => html`
<li className="ServerList__item AddServer" data-tooltip=${ __('Add new server') } onClick=${ onClick }>
	<span>+</span>
</li>
`);


export default class Sidebar extends React.PureComponent {
	constructor(props) {
		super(props);

		this.state = {
			hotkeyVisible: false,
			faviconsLoaded: {},
		};

		this.handleKeyDownForHotKeys = this.handleKeyDownForHotKeys.bind(this);
		this.handleKeyUpForHotKeys = this.handleKeyUpForHotKeys.bind(this);
	}

	handleContextMenu(host, event) {
		event.preventDefault();

		const menu = Menu.buildFromTemplate(this.createMenuTemplate(host));
		menu.popup(getCurrentWindow());
	}

	createMenuTemplate(host) {
		return [
			{
				label: __('Reload_server'),
				click: this.props.onReloadServer && this.props.onReloadServer.bind(null, host),
			},
			{
				label: __('Remove_server'),
				click: this.props.onRemoveServer && this.props.onRemoveServer.bind(null, host),
			},
			{
				type: 'separator',
			},
			{
				label: __('Open DevTools'),
				click: this.props.onOpenDevToolsForServer && this.props.onOpenDevToolsForServer.bind(null, host),
			},
		];
	}

	handleKeyDownForHotKeys(e) {
		if (['Control', 'Meta'].includes(e.key)) {
			this.setState({ hotkeyVisible: true });
		}
	}

	handleKeyUpForHotKeys(e) {
		if (['Control', 'Meta'].includes(e.key)) {
			this.setState({ hotkeyVisible: false });
		}
	}

	handleServerClick(host) {
		this.props.onActivateServer && this.props.onActivateServer.call(null, host);
	}

	handleDragOver(host, event) {
		event.preventDefault();
	}

	handleDragStart(host, event) {
		event.dataTransfer.dropEffect = 'move';
		event.dataTransfer.effectAllowed = 'move';
		this.setState({
			hosts: this.props.hosts,
			moving: host.url,
		});
	}

	handleDragEnter(host) {
		const srcHost = this.state.hosts.find(({ url }) => url === this.state.moving);
		const destHost = this.state.hosts.find(({ url }) => url === host.url);
		this.setState({
			hosts: this.state.hosts.map((host) => {
				if (host.url === srcHost.url) {
					return destHost;
				}

				if (host.url === destHost.url) {
					return srcHost;
				}

				return host;
			}),
		});
	}

	handleDragEnd() {
		this.setState({ moving: null });
	}

	handleDrop(host, event) {
		event.preventDefault();

		const orderedUrls = this.state.hosts.map(({ url }) => url);

		this.props.onSortServers && this.props.onSortServers.call(null, orderedUrls);
		this.props.onActivateServer && this.props.onActivateServer.call(null, host);

		this.setState({ hosts: null });
	}

	handleFaviconLoad(host) {
		this.setState({
			faviconsLoaded: {
				...this.state.faviconsLoaded,
				[host.url]: true,
			},
		});
	}

	handleAddServerClick() {
		this.props.onAddServer && this.props.onAddServer.call(this);
	}

	updateContainer() {
		const { visible, active, backgrounds = {}, colors = {} } = this.props;

		document.querySelector('.Sidebar').classList[visible ? 'remove' : 'add']('Sidebar--hidden');
		document.querySelector('.Sidebar').style.background = backgrounds[active] || '';
		document.querySelector('.Sidebar').style.color = colors[active] || '';
	}

	componentDidMount() {
		window.addEventListener('keydown', this.handleKeyDownForHotKeys, false);
		window.addEventListener('keyup', this.handleKeyUpForHotKeys, false);
		this.updateContainer();
	}

	componentWillUnmount() {
		window.removeEventListener('keydown', this.handleKeyDownForHotKeys, false);
		window.removeEventListener('keyup', this.handleKeyUpForHotKeys, false);
	}

	componentDidUpdate() {
		this.updateContainer();
	}

	renderServer(host, i) {
		const { active, badges = {} } = this.props;
		const { faviconsLoaded, hotkeyVisible, moving } = this.state;

		return html`
		<${ Server }
			key=${ i }
			active=${ host.url === active }
			badge=${ badges[host.url] }
			faviconLoaded=${ faviconsLoaded[host.url] }
			hotkeyVisible=${ hotkeyVisible }
			index=${ i + 1 }
			moving=${ host.url === moving }
			title=${ host.title }
			url=${ host.url }
			onClick=${ this.handleServerClick.bind(this, host) }
			onDragOver=${ this.handleDragOver.bind(this, host) }
			onDragStart=${ this.handleDragStart.bind(this, host) }
			onDragEnter=${ this.handleDragEnter.bind(this, host) }
			onDragEnd=${ this.handleDragEnd.bind(this, host) }
			onDrop=${ this.handleDrop.bind(this, host) }
			onContextMenu=${ this.handleContextMenu.bind(this, host) }
			onFaviconLoad=${ this.handleFaviconLoad.bind(this, host) }
		/>
		`;
	}

	render() {
		return html`
		<div className=${ ['Sidebar__inner', process.platform === 'darwin' && 'Sidebar__inner--mac'].filter(Boolean).join(' ') }>
			<ol className="Sidebar__server-list ServerList">
				${ (this.state.hosts || this.props.hosts || []).map(this.renderServer.bind(this)) }
				<${ AddServer } onClick=${ this.handleAddServerClick.bind(this) } />
			</ol>
		</div>
		`;
	}
}
