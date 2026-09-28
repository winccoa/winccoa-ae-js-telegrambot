const { Bot } = require('node-telegram-bot-api');
const { fromPath } = require('node-telegram-bot-api/node');
const { processMessage } = require('./messageHandler');
const { State } = require('../utils/stateManager');
const { convertQuery } = require('../utils/queryConverter');
const dpName = "myBot"

let stateManager = null;

let registeredCallbacks = new Map();

function TBot(apiKey, isChatAllowed) {
    this.bot = new Bot(apiKey);
    this.sendMessage = function (chatId, text, options) {
        return this.bot.api.sendMessage({ chat_id: chatId, text, ...options });
    }
    this.message = (event, callback) => {
        this.bot.on(event, (context) => callback(context.update[event]));
    };
    this.on = function (event, callback) {
        this.bot.on(event, (context) => callback(context.update[event]));
    }

    this.sendPhoto = async function (chatId, photo, options) {
        return this.bot.api.sendPhoto({ chat_id: chatId, photo: await fromPath(photo), ...options });
    };

    this.action = function (action, callback) {
        if (callback === null) {
            registeredCallbacks.delete(action);
            return;
        }
        registeredCallbacks.set(action, callback);
    };
    this.pendingAcknowledgements = new Map();
    this.registerAcknowledgement = function (chatId, messageId, callbackData, dpe) {
        const normalizedChatId = chatId.toString();
        for (const [key, value] of this.pendingAcknowledgements) {
            if (value.chatId === normalizedChatId && value.dpe === dpe) {
                this.pendingAcknowledgements.delete(key);
            }
        }
        this.pendingAcknowledgements.set(`${normalizedChatId}:${messageId}`, {
            chatId: normalizedChatId,
            callbackData,
            dpe
        });
    };
    this.retainAcknowledgements = function (chatId, dpes) {
        const normalizedChatId = chatId.toString();
        for (const [key, value] of this.pendingAcknowledgements) {
            if (value.chatId === normalizedChatId && !dpes.includes(value.dpe)) {
                this.pendingAcknowledgements.delete(key);
            }
        }
    };

    this.sendDocument = function (chatId, document, caption, options) {
        return fromPath(document).then((inputFile) => this.bot.api.sendDocument({
            chat_id: chatId,
            document: inputFile,
            caption,
            ...options
        }));
    };

    this.editMessageReplyMarkup = function (chatId, messageId, inlineKeyBoard) {
        return this.bot.api.editMessageReplyMarkup({
            chat_id: chatId,
            message_id: messageId,
            reply_markup: inlineKeyBoard
        });
    }
    this.editMessageText = function (chatId, messageId, text) {
        return this.bot.api.editMessageText({ chat_id: chatId, message_id: messageId, text });
    }
    this.bot.on('callback_query', async (context) => {
        const query = context.callbackQuery;
        const chatId = query.message?.chat.id?.toString();
        if (!chatId || !isChatAllowed(chatId)) {
            await context.answerCallbackQuery({ text: 'Access denied' });
            return;
        }
        const callbackData = query.data;
        for (const [action, callback] of registeredCallbacks) {
            if (callbackData && callbackData.startsWith(`${action}:`)) {
                await callback(query, callbackData);
                await context.answerCallbackQuery();
                return;
            }
        }
    });
    this.start = function () {
        this.bot.api.deleteWebhook({ drop_pending_updates: true })
            .then(() => this.bot.startPolling())
            .catch((error) => console.error('Telegram polling stopped:', error));
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
    myBot = new TBot(apiKey, (chatId) => allowedChats?.includes(chatId) ?? false);
    myBot.action('ack', (query) => acknowledgeAlert(winccoa, myBot, query));
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
    myBot.start();
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
    const activeDpes = values.slice(1).map(value => value[0]);
    myBot.retainAcknowledgements(chatId, activeDpes);
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
        const callbackData = `ack:${winccoa.dpGetId(dpName)[0]}:${winccoa.dpGetId(dpName)[1]}`;
        const buttons = dpesForAck.includes(dpName) && (ack === 1 || ack === 3)
            ? [[{
                text: `Ack`,
                callback_data: callbackData,
            }]]
            : [[]];
        const message = await myBot.sendMessage(chatId, `${text} {${btnText} ${val}}`, { reply_markup: { inline_keyboard: buttons } });
        if (buttons[0].length > 0) {
            myBot.registerAcknowledgement(chatId, message.message_id, callbackData, dpName);
        }
    }
}

async function acknowledgeAlert(winccoa, myBot, query) {
    const chatId = query.message?.chat.id?.toString();
    const messageId = query.message?.message_id;
    if (!chatId || messageId === undefined) return;

    const key = `${chatId}:${messageId}`;
    const pending = myBot.pendingAcknowledgements.get(key);
    if (!pending || pending.callbackData !== query.data) return;

    myBot.pendingAcknowledgements.delete(key);
    const ackResult = await winccoa.dpGet(`${pending.dpe}:_alert_hdl.._act_state`);
    const ackState = Array.isArray(ackResult) ? ackResult[0] : ackResult;
    if (ackState !== 1 && ackState !== 3) return;

    await winccoa.dpSet(`${pending.dpe}:_alert_hdl.._ack`, 2);
    await myBot.editMessageReplyMarkup(chatId, messageId, { inline_keyboard: [] });
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
module.exports.TBot = TBot;
