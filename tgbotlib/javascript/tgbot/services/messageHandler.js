const { configureTrends, 
    trendHandlers, 
    showAvailableTrends, 
    addTrend, 
    deleteTrend, 
    editExistingTrend } = require('./trendService');
const { generalAlarms, muteUnmute } = require('./alarmService');
const { generalValueSet, valuesHandlers } = require('./setValueService');
const { MainMenuMarkup, ConfigsMenuMarkup } = require('../utils/menusmarkups');
const { State } = require('../utils/stateManager');

const dpName = "myBot"

const messageHadlers = new Map([
    ["/start", sendHomeMenu],
    ['📈 trends', showAvailableTrends],
    ['trends conf', configureTrends],
    ['🚨 alarms', generalAlarms],
    ['🏠 home', sendHomeMenu],
    ['alarm subscriptions', muteUnmute],
    ['⚙️ configs', sendConfigMenu],
    ['➕ add trend', addTrend],
    ['➖ delete trend', deleteTrend],
    ['⚙️ edit trend', editExistingTrend],
    ['🔧 parameters', generalValueSet],
]);

function sendConfigMenu(winccoa, msg, myBot, chatId) {
    let stateManager = new State(winccoa);
    let state = stateManager.getState();
    if (!state[chatId]) {
        state[chatId] = {};
    }
    state[chatId]["menu"] = "CONFIGS";
    stateManager.setState(state);
    myBot.sendMessage(chatId, "Configs Menu",
        { reply_markup: ConfigsMenuMarkup });
}

function sendHomeMenu(winccoa, msg, myBot, chatId) {
    let stateManager = new State(winccoa);
    let state = stateManager.getState();
    if (!state[chatId]) {
        state[chatId] = {};
    }
    state[chatId]["menu"] = "HOME";
    stateManager.setState(state);
    myBot.sendMessage(chatId, "Home Menu",
        { reply_markup: MainMenuMarkup });
}

function processMessage(msg, allowedChats, presentedChats, winccoa, myBot) {
    let chatId = msg.chat.id.toString()
    if (allowedChats.includes(chatId)) {
        const funcName = msg.text.toLowerCase();
        if (messageHadlers.has(funcName)) {
            messageHadlers.get(funcName)(winccoa, funcName, myBot, chatId);
            return;
        }
        let stateManager = new State(winccoa);
        let state = stateManager.getState();
        if (!state[chatId]) {
            state[chatId] = {};
        }
        let chatState = state[chatId]["state"];
        let handler = trendHandlers.get(chatState) ?? valuesHandlers.get(chatState);
        if (handler) {
            handler(winccoa, msg, myBot, chatId);
            return;
        }
        myBot.sendMessage(chatId, "Sorry, I don't understand you.");
        console.error("Something went wrong: " + funcName + " is not a valid command.");
    }
    if (!presentedChats.includes(chatId)) {
        presentedChats.push(chatId);
        winccoa.dpSet(`${dpName}.chatIds`, presentedChats);
    }
}

module.exports.processMessage = processMessage