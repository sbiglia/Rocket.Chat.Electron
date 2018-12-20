import { ipcRenderer } from 'electron';
import setupContextMenuPreload from './preload/contextMenu';
import setupEventsPreload from './preload/events';
import setupJitsiPreload from './preload/jitsi';
import setupLinksPreload from './preload/links';
import setupNotificationsPreload from './preload/notifications';
import setupSidebarPreload from './preload/sidebar';
import setupSpellcheckingPreload from './preload/spellchecking';
// import './stylesheets/main.less';
console.log(document.head);


setupContextMenuPreload();
setupEventsPreload();
setupJitsiPreload();
setupLinksPreload();
setupNotificationsPreload();
setupSidebarPreload();
setupSpellcheckingPreload();

window.reloadServer = () => ipcRenderer.sendToHost('reload-server');
window.i18n = require('./i18n').default;
