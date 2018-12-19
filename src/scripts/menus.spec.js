/* eslint-env node, mocha */
import { remote } from 'electron';
import { expect, spy, use } from 'chai';
import spies from 'chai-spies';
import menus from './menus';
const { Menu } = remote;


describe('menus', () => {
	before(() => {
		use(spies);
	});

	let menu;

	beforeEach(async() => {
		await menus.update();
		menu = Menu.getApplicationMenu();
	});

	it('should be the application menu', () => {
		expect(menu.items).to.not.be.empty;
	});

	it('should update on set state', () => {
		spy.on(menus, 'update');
		menus.setState({});
		expect(menus.update).to.have.been.called;
		spy.restore(menus, 'update');
	});

	const itShouldHaveAnItem = (id, which) => it(`should have an item "${ id }"`, () => {
		const item = menus.getItem(id);
		expect(item).to.not.be.null;
		which && which(item);
	});

	itShouldHaveAnItem('quit', async(item) => {
		const cb = spy();
		menus.on('quit', cb);
		item.click();
		expect(cb).to.have.been.called;
	});

	itShouldHaveAnItem('about', (item) => {
		const cb = spy();
		menus.on('about', cb);
		item.click();
		expect(cb).to.have.been.called;
	});
});
