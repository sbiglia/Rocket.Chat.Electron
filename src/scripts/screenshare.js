import { remote } from 'electron';
import React from 'react';
import ReactDOM from 'react-dom';
import Screenshare from '../components/Screenshare';
const { getCurrentWindow } = remote;


export default () => {
	window.addEventListener('load', () => {
		ReactDOM.render(React.createElement(Screenshare), document.querySelector('.screenshare'));
		getCurrentWindow().once('ready-to-show', () => getCurrentWindow().show());
	});
};
