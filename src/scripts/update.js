import { remote } from 'electron';
import React from 'react';
import ReactDOM from 'react-dom';
import Update from '../components/Update';
const { getCurrentWindow } = remote;

export default () => {
	const { params: { currentVersion = 'a.b.c', newVersion = 'x.y.z' } = {} } = getCurrentWindow() || {};

	window.addEventListener('load', () => {
		ReactDOM.render(React.createElement(Update, { currentVersion, newVersion }), document.querySelector('.update'));
		getCurrentWindow().once('ready-to-show', () => getCurrentWindow().show());
	});
};
