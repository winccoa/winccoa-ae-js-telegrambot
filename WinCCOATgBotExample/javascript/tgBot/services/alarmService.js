const { AlarmsMenuMarkup } = require('../utils/menusmarkups');
const { State } = require('../utils/stateManager');
const dpName = "myBot"
async function generalAlarms(winccoa, msg, myBot, chatId) {
    let stateManager = new State(winccoa);
    let entries = (await winccoa.dpGet([`${dpName}.alarmQuery`]))[0];
    let dpes;
    for (let entry of entries) {
        let splitted = entry.split('#');
        let entryChatId = splitted[0];
        if (chatId != entryChatId) {
            continue;
        }
        let query = splitted[1];
        let state = stateManager.getState();
        dpes = (await winccoa.dpQuery(query)).slice(1).map((value) => value);
        if (!state[chatId]) {
            state[chatId] = {};
        }
        if (!state[chatId]['mutedDPEs']) {
            state[chatId]['mutedDPEs'] = [];
        }
    }
    myBot.sendMessage(chatId, "Current alarms",
        {
            reply_markup: AlarmsMenuMarkup
    });

    let dpesForAck = (await winccoa.dpGet(`${dpName}.alertsForAck`))
        .filter(str => str.includes(chatId))[0]
        ?.replace(`${chatId}#`, '').split(';').filter(x => x != '') ?? [];
    dpes.forEach(async ([dpe, alerttime, val, text, ack]) => {
        const btnTxt = winccoa.dpGetDescription(dpe);
        const buttons = dpesForAck.includes(dpe) && (ack == 1 || ack == 3)
            ? [[{
                text: `Ack`,
                callback_data: `ack:${winccoa.dpGetId(dpe)[0]}:${winccoa.dpGetId(dpe)[1]}:${chatId}`,
            }]]
            : [[]];
        await myBot.sendMessage(chatId, `${text} {${btnTxt} ${val}}`, { reply_markup: { inline_keyboard: buttons } });
    })
}

let answeredQueries = new Map();

async function muteUnmute(winccoa, msg, myBot, chatId) {
    const inlineKeyboard = makeReplyMarkup(chatId, winccoa);
    await myBot.sendMessage(chatId, "Choose an option:", { reply_markup: { inline_keyboard: inlineKeyboard } });
    myBot.action('mute', async (query) => {
        const [, dpEl_id1, dpEl_id2, chatId] = query.data.split(':');
        const dpe = winccoa.dpGetName(Number(dpEl_id1), Number(dpEl_id2));
        if (answeredQueries.has(query.id)) return;
        answeredQueries.set(query.id, '');
        let stateManager = new State(winccoa);
        let state = stateManager.getState();
        state[chatId]['mutedDPEs'].push(dpe);
        stateManager.setState(state);
        const newKeyboard = makeReplyMarkup(chatId, winccoa);
        myBot.editMessageReplyMarkup(query.message.chat.id, query.message.message_id, { inline_keyboard: newKeyboard });
    });
    myBot.action('unmute', async (query) => {
        const [, dpEl_id1, dpEl_id2, chatId] = query.data.split(':');
        const dpe = winccoa.dpGetName(Number(dpEl_id1), Number(dpEl_id2));
        if (answeredQueries.has(query.id)) return;
        answeredQueries.set(query.id, '');
        let stateManager = new State(winccoa);
        let state = stateManager.getState();
        let index = state[chatId]['mutedDPEs'].indexOf(dpe);
        if (index > -1) {
            state[chatId]['mutedDPEs'].splice(index, 1);
        }
        stateManager.setState(state);
        const newKeyboard = makeReplyMarkup(chatId, winccoa);
        myBot.editMessageReplyMarkup(query.message.chat.id, query.message.message_id, { inline_keyboard: newKeyboard });
    });
}

function makeReplyMarkup(chatId, winccoa) {
    let stateManager = new State(winccoa);
    let state = stateManager.getState();
    if (!state[chatId]) {
        state[chatId] = {};
    }
    if (!state[chatId]['mutedDPEs']) {
        state[chatId]['mutedDPEs'] = [];
    }
    let mutedDPEs = state[chatId]['mutedDPEs'];
    let dpes = state[chatId]['dpesForSubscription'];
    let unmutedDPEs = dpes.filter(x => !mutedDPEs.includes(x));
    let newKeyboard = unmutedDPEs.map(x => {
        const dpEl_id = winccoa.dpGetId(x);
        const text = winccoa.dpGetDescription(x);
        return [{ text: `Mute ${text}`, callback_data: `mute:${dpEl_id[0]}:${dpEl_id[1]}:${chatId}` }];
    });
    let mutedKeyBoard = mutedDPEs.map(x => {
        const dpEl_id = winccoa.dpGetId(x);
        const text = winccoa.dpGetDescription(x);
        return [{ text: `Unmute ${text}`, callback_data: `unmute:${dpEl_id[0]}:${dpEl_id[1]}:${chatId}` }];
    });
    newKeyboard = newKeyboard.concat(mutedKeyBoard);
    return newKeyboard;
}

module.exports.generalAlarms = generalAlarms
module.exports.muteUnmute = muteUnmute