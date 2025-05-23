const { WinccoaManager } = require('winccoa-manager');
const { runTelegramBot } = require('./services/TelegramBot');
const { State } = require('./utils/stateManager');
const winccoa = new WinccoaManager();
const singleton = new State(winccoa);
runTelegramBot(winccoa);
console.log('Start');
