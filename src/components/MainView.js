import htm from 'htm';
import React from 'react';
import { __ } from '../i18n';
const html = htm.bind(React.createElement);


export default class MainView extends React.PureComponent {
	constructor(props) {
		super(props);

		this.handleOnline = this.handleOnline.bind(this);
		this.handleOffline = this.handleOffline.bind(this);
	}

	handleOnline() {
		document.body.classList.remove('offline');
	}

	handleOffline() {
		document.body.classList.add('offline');
	}

	componentDidMount() {
		window.addEventListener('online', this.handleOnline, false);
		window.addEventListener('offline', this.handleOffline, false);
		navigator.onLine ? this.handleOnline() : this.handleOffline();
	}

	componentWillUnmount() {
		window.removeEventListener('online', this.handleOnline, false);
		window.removeEventListener('offline', this.handleOffline, false);
	}

	render() {
		return html`
		<${ React.Fragment }>
			<section className="Landing">
				<div className="Landing__inner">
					<div>
						<img className="Landing__logo" src="./images/logo-dark.svg" />
					</div>

					<div className="loading-indicator">
						<span className="dot"></span>
						<span className="dot"></span>
						<span className="dot"></span>
					</div>

					<form className="Landing__registerServer RegisterServer" id="login-card">
						<h2>${ __('Enter_your_server_URL') }</h2>

						<div className="fields">
							<div className="input-text active">
								<input type="text" name="host" placeholder="https://open.rocket.chat" dir="auto" />
							</div>
						</div>

						<div id="invalidUrl" style=${ { display: 'none' } } className="alert alert-danger">${ __('No_valid_server_found') }</div>

						<div className="connect__error alert alert-danger only-offline">${ __('Check_connection') }</div>

						<div className="submit">
							<button type="submit" data-loading-text="Connecting..." className="button primary login">${ __('Connect') }</button>
						</div>
					</form>
				</div>
			</section>
		</${ React.Fragment }>
		`;
	}
}
