import { ipcRenderer, remote } from 'electron';
import React from 'react';
import htm from 'htm';
import { __ } from '../i18n';
import { copyright } from '../../package.json';
const html = htm.bind(React.createElement);


const AppInfo = ({ appVersion }) => html`
	<section className="app-info">
		<div className="app-logo">
			<img src="./images/logo.svg" />
		</div>

		<div className="app-version">
			${ __('Version') } <span className="version">${ appVersion }</span>
		</div>
	</section>
`;

const Copyright = () => html`
	<div className="copyright">
		${ __('Copyright', copyright) }
	</div>
`;

const Updating = ({ message }) => (message ? html`
	<div className="checking-for-updates">
		<span className="message message-shown">${ message }</span>
	</div>
` : html`
	<div className="checking-for-updates">
		<span className="dot"></span>
		<span className="dot"></span>
		<span className="dot"></span>
	</div>
`);

const Updates = ({ updating, message, canAutoUpdate, canSetAutoUpdate, onCheckForUpdates, onSetAutoUpdate }) => html`
	<section className="updates">
		${ (updating ?
		html`<${ Updating } message=${ message } />` :
		html`
			<button
				className="check-for-updates button primary"
				disabled=${ updating }
				onClick=${ onCheckForUpdates }
			>
				${ __('Check_for_Updates') }
			</button>
		`) }

		<label className="check-for-updates-on-start__label">
			<input className="check-for-updates-on-start" type="checkbox" checked=${ canAutoUpdate }
				disabled=${ !canSetAutoUpdate } onChange=${ onSetAutoUpdate } />
			<span>${ __('Check_for_Updates_on_Start') }</span>
		</label>
	</section>
`;

export default class About extends React.PureComponent {
	constructor(props) {
		super(props);

		const appName = remote.app.getName();
		const appVersion = remote.app.getVersion();
		this.state = {
			updating: false,
			message: null,
			appName,
			appVersion,
		};

		this.handleCheckForUpdates = this.handleCheckForUpdates.bind(this);
		this.handleUpdateResult = this.handleUpdateResult.bind(this);
		this.handleUpdateError = this.handleUpdateError.bind(this);
		this.handleSetAutoUpdate = this.handleSetAutoUpdate.bind(this);
	}

	handleCheckForUpdates() {
		this.setState({
			updating: true,
		});
		ipcRenderer.send('check-for-updates', { forced: true });
	}

	handleUpdateResult(e, updateAvailable) {
		if (updateAvailable) {
			this.setState({ updating: false, message: null });
			return;
		}

		this.setState({ message: __('No updates are available.') });

		setTimeout(() => {
			this.setState({ updating: false, message: null });
		}, 5000);
	}

	handleUpdateError() {
		this.setState({ message: __('An error has occurred while looking for updates.') });

		setTimeout(() => {
			this.setState({ updating: false, message: null });
		}, 5000);
	}

	handleSetAutoUpdate({ target: { checked } }) {
		ipcRenderer.send('set-auto-update', checked);
		this.setState({
			canAutoUpdate: checked,
		});
	}

	componentWillMount() {
		const canUpdate = ipcRenderer.sendSync('can-update');
		const canAutoUpdate = canUpdate ? ipcRenderer.sendSync('can-auto-update') : false;
		const canSetAutoUpdate = canUpdate ? ipcRenderer.sendSync('can-set-auto-update') : false;

		this.setState({
			canUpdate,
			canAutoUpdate,
			canSetAutoUpdate,
		});
	}

	componentDidMount() {
		document.title = __('About %s', this.state.appName);
		ipcRenderer.on('update-result', this.handleUpdateResult);
		ipcRenderer.on('update-error', this.handleUpdateError);
	}

	componentWillUnmount() {
		ipcRenderer.off('update-result', this.handleUpdateResult);
		ipcRenderer.off('update-error', this.handleUpdateError);
	}

	render() {
		return html`
			<div className="about__wrapper">
				<${ AppInfo } appVersion=${ this.state.appVersion } />

				${ this.state.canUpdate ? html`
					<${ Updates }
						updating=${ this.state.updating }
						message=${ this.state.message }
						canAutoUpdate=${ this.state.canAutoUpdate }
						canSetAutoUpdate=${ this.state.canSetAutoUpdate }
						onCheckForUpdates=${ this.handleCheckForUpdates }
						onSetAutoUpdate=${ this.handleSetAutoUpdate }
					/>` : null }

				<${ Copyright } />
			</div>
		`;
	}
}
