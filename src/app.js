import about from './scripts/about';
import main from './scripts/main';
import screenshare from './scripts/screenshare';
import update from './scripts/update';


const pages = {
	about,
	main,
	screenshare,
	update,
};

(pages[document.currentScript.dataset.page] || pages.main)();
