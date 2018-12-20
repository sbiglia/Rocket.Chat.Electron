import about from './scripts/about';
import main from './scripts/main';
import screenshare from './scripts/screenshare';
import update from './scripts/update';
import './stylesheets/main.less';


const pages = {
	about,
	main,
	screenshare,
	update,
};

(pages[document.currentScript.dataset.page] || pages.main)();
