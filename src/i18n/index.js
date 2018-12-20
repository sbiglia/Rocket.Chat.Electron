import { app, ipcMain, ipcRenderer, remote } from 'electron';
import jetpack from 'fs-jetpack';
import mem from 'mem';
import util from 'util';


class I18n {
	__(phrase, ...replacements) {
		return this.translate({ phrase, replacements });
	}

	pluralize(phrase, count, ...replacements) {
		return this.translate({ phrase, count, replacements });
	}
}


class MainProcessI18n extends I18n {
	constructor() {
		super();

		this.translations = {};
		this.locale = null;

		ipcMain.on('translate', (event, options) => {
			event.returnValue = this.translate(options);
		});
	}

	loadTranslationsFor(locale) {
		try {
			const translation = jetpack.cwd(__dirname, app.getAppPath().endsWith('app.asar') ? '..' : '.', 'i18n', 'lang')
				.read(`${ locale }.i18n.json`, 'json');
			if (!translation) {
				console.warn(`There is no translations for locale "${ locale }"`);
				return;
			}

			this.translations[locale] = translation;
		} catch (error) {
			console.error(error);
		}
	}

	getTranslationFor(locale, phrase) {
		if (!this.locale) {
			this.locale = app.getLocale();
		}

		if (!locale) {
			locale = this.locale;
		}

		if (this.translations[locale] && this.translations[locale][phrase]) {
			return this.translations[locale][phrase];
		}

		this.loadTranslationsFor(locale);
		if (this.translations[locale] && this.translations[locale][phrase]) {
			return this.translations[locale][phrase];
		}

		if (!this.translations.en) {
			this.loadTranslationsFor('en');
		}

		return (this.translations.en || {})[phrase];
	}

	translate({ phrase, count, locale, replacements = [] }) {
		const translation = this.getTranslationFor(locale, phrase);

		if (!translation) {
			return phrase;
		}

		if (typeof translation === 'object') {
			const key = (count === 0 && 'zero') ||
				(count === 1 && 'one') ||
				(count > 1 && 'multi');

			const selectedTranslation = translation[key] || Object.values(translation)[0];
			return util.format(String(selectedTranslation), ...replacements);
		}

		return util.format(String(translation), ...replacements);
	}
}


class RendererProcessI18n extends I18n {
	constructor() {
		super();

		this.translate = mem(this.translate.bind(this));
	}

	translate(options) {
		return ipcRenderer.sendSync('translate', options);
	}
}


const instance = remote ? new RendererProcessI18n : new MainProcessI18n;

export const __ = instance.__.bind(instance);

export default instance;
