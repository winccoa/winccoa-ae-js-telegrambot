const TelegramBot = require('node-telegram-bot-api');
const { processMessage } = require('./messageHandler');
const { State } = require('../utils/stateManager');
const { convertQuery } = require('../utils/queryConverter');
const dpName = "myBot"

let stateManager = null;

let registeredCallbacks = new Map();

let answeredQueries = new Map();
function TBot(apiKey) {
    this.bot = new TelegramBot(apiKey, { polling: true });
    this.sendMessage = function (chatId, text, options) {
        this.bot.sendMessage(chatId, text, options);
    }
    this.message = (event, callback) => {
        this.bot.on(event, callback);
    };
    this.on = function (event, callback) {
        this.bot.on(event, callback);
    }

    this.sendPhoto = function (chatId, photo, caption) {
        this.bot.sendPhoto(chatId, photo, { caption });
    };

    this.action = function (action, callback) {
        if (registeredCallbacks.has(action)) {
            return;
        }
        else {
            registeredCallbacks.set(action,'')
        }
        this.bot.on('callback_query', (query) => {
            const callbackData = query.data;

            if (callbackData && callbackData.startsWith(action)) {
                callback(query, callbackData);
            }
        });
    };

    this.sendDocument = function (chatId, document, caption) {
        this.bot.sendDocument(chatId, document, { caption });
    };

    this.editMessageReplyMarkup = function (chatId, messageId, inlineKeyBoard) {
        this.bot.editMessageReplyMarkup(inlineKeyBoard, { chat_id: chatId, message_id: messageId });
    }
    this.editMessageText = function (chatId, messageId, text) {
        this.bot.editMessageText(text, { chat_id: chatId, message_id: messageId });
    }
    this.activeChats = {};
}

let myBot = null;

const runTelegramBot = async (winccoa) => {
    const [apiKey] = await winccoa.dpGet([`${dpName}.apiKey`]);
    let presentedChats = (await winccoa.dpGet([`${dpName}.chatIds`]))[0];
    let allowedChats = (await winccoa.dpGet([`${dpName}.allowedChats`]))[0];
    if (!presentedChats || presentedChats.length === 0) {
        presentedChats = [];
    }
    myBot = new TBot(apiKey);
    stateManager = new State(winccoa);
    try {
        winccoa.dpConnect((n, v, t, e) => allowedChats = v[0], [`${dpName}.allowedChats`], true);
        winccoa.dpConnect(connectCB, [`${dpName}.message`], false);
    }
    catch (exc) {
        console.error(exc);
    }
    myBot.message('message', (msg) => {
        processMessage(msg, allowedChats, presentedChats, winccoa, myBot)
    });
    let entries = (await winccoa.dpGet([`${dpName}.alarmQuery`]))[0];
    for (let entry of entries) {
        let splitted = entry.split('#');
        let chatId = splitted[0];
        let query = splitted[1];
        let state = stateManager.getState();
        let dpes = (await winccoa.dpQuery(convertQuery(query))).slice(1).map((value) => value[0]);
        if (!state[chatId]) {
            state[chatId] = {};
        }
        state[chatId]['dpesForSubscription'] = dpes;

        if (!state[chatId]['mutedDPEs']) {
            state[chatId]['mutedDPEs'] = [];
        }
        state[chatId]['mutedDPEs'] = state[chatId]['mutedDPEs'].filter(dpe => dpes.includes(dpe));
        stateManager.setState(state);
        subsribeOnAlertsQuery(chatId, query, winccoa);
    }
}

function subsribeOnAlertsQuery(chatId, query, winccoa) {
    winccoa.dpQueryConnectSingle((values, type, error) => sendAllertMessage(winccoa, chatId, values, type, error), true, query);
}

async function sendAllertMessage(
    winccoa,
    chatId,
    vals,
    type,
    error
) {
    let values = vals.filter(x => x != null && x != undefined && x != '');
    if (error) {
        console.log(error);
        return;
    }
    if (values.length <= 1) return;
    let dpesForAck = (await winccoa.dpGet(`${dpName}.alertsForAck`))
        .filter(str => str.includes(chatId))[0]
        ?.replace(`${chatId}#`, '').split(';').filter(x => x != '') ?? [];
    let mutedDPEs = stateManager.getState()[chatId]['mutedDPEs'].filter(x => x != '');
    for (let i = 1; i < values.length; i++) {
        if(mutedDPEs && mutedDPEs.length > 0 && mutedDPEs.includes(values[i][0])) continue;
        let dpName = values[i][0];
        let val = values[i][2];
        let text = values[i][3];
        let ack = await winccoa.dpGet(`${dpName}:_alert_hdl.._act_state`);
        const btnText = winccoa.dpGetDescription(dpName);
        const buttons = dpesForAck.includes(dpName) && (ack === 1 || ack === 3)
            ? [[{
                text: `Ack`,
                callback_data: `ack:${winccoa.dpGetId(dpName)[0]}:${winccoa.dpGetId(dpName)[1]}:${chatId}`,
            }]]
            : [[]];
        myBot.sendMessage(chatId, `${text} {${btnText} ${val}}`, { reply_markup: { inline_keyboard: buttons } });
        myBot.action('ack', async (query) => {
            if (answeredQueries.has(query.id)) return;
            answeredQueries.set(query.id, '');
            const [, dpEl_id1, dpEl_id2, chatId] = query.data.split(':');
            const dpe = winccoa.dpGetName(Number(dpEl_id1), Number(dpEl_id2));
            await winccoa.dpSet(`${dpe}:_alert_hdl.._ack`, 2);
            myBot.editMessageReplyMarkup(query.message.chat.id, query.message.message_id, { inline_keyboard: [] });
        });
    }
}

function connectCB(
    names,
    values,
    type,
    error
) {
    try {
        let msg = values[0].split('#');
        myBot.sendMessage(msg[0], msg[1]);
    }
    catch (exc) {
        console.error(exc);
    }
}

module.exports.runTelegramBot = runTelegramBot;