import main from './scripts/main';

switch (document.currentScript.dataset.page) {
	case 'main':
	default:
		main();
}
