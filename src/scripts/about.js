import { remote } from 'electron';
import React from 'react';
import ReactDOM from 'react-dom';
import About from '../components/About';
const { getCurrentWindow } = remote;


export default () => {
	window.addEventListener('load', () => {
		const root = document.querySelector('.about');
		ReactDOM.render(React.createElement(About), root);
		getCurrentWindow().once('ready-to-show', () => getCurrentWindow().show());
	});
};
