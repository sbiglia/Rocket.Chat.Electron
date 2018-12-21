import { ipcRenderer, desktopCapturer } from 'electron';
import React from 'react';
import htm from 'htm';
import { __ } from '../i18n';
const html = htm.bind(React.createElement);


export default class Screenshare extends React.PureComponent {
	constructor(props) {
		super(props);

		this.state = {
			sources: [],
		};

		this.updateScreens = this.updateScreens.bind(this);
	}

	updateScreens() {
		if (!this.updatingScreens) {
			return;
		}

		desktopCapturer.getSources({ types: ['window', 'screen'] }, (error, sources) => {
			if (error) {
				throw error;
			}

			this.setState({
				sources: sources.map(({ id, name, thumbnail }) => ({ id, name, thumbnail: thumbnail.toDataURL() })),
			});

			setTimeout(this.updateScreens, 1000);
		});
	}

	handleScreeshareSelected(id) {
		return () => {
			ipcRenderer.send('select-screenshare-source', id);
			window.close();
		};
	}

	componentWillMount() {
		this.updatingScreens = true;
		this.updateScreens();
	}

	componentDidMount() {
		document.title = __('Share_Your_Screen');
	}

	componentWillUnmount() {
		this.updatingScreens = false;
	}

	render() {
		return html`
		<div className="screenshare__wrapper">
			<h1 class="screenshare-title">${ __('Select_a_screen_to_share') }</h1>
			<div class="screenshare-sources">
			 ${ (this.state.sources.map(({ id, name, thumbnail }) => html`
			 	<div class="screenshare-source" onClick=${ this.handleScreeshareSelected(id) }>
					<div class="screenshare-source-thumbnail">
						<img src=${ thumbnail } alt=${ name } />
					</div>
					<div class="screenshare-source-name">${ name }</div>
				</div>
			 `)) }
			</div>
		</div>
		`;
	}
}
