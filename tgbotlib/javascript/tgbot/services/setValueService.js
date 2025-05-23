const { State } = require("../utils/stateManager");
const { WinccoaElementType } = require('winccoa-manager');
const dpName = "myBot"

const valuesHandlers = new Map([
    ["awaiting_value", setValue],
]);

async function generalValueSet(winccoa, msg, myBot, chatId) {
    let stateManager = new State(winccoa);
    let state = stateManager.getState()
    const dpes = (await winccoa.dpGet(`${dpName}.dpesForSet`))
        .filter(x => x.includes(chatId))[0].replace(`${chatId}#`, '').split(';').filter(x => x != '');
    if (dpes.length == 0) {
        myBot.sendMessage(chatId, "You do not have valid DPEs for set");
        return;
    }
    let keyboard = [];
    const values = (await winccoa.dpGet(dpes));
    const times = (await winccoa.dpGet(dpes.map((dpe) => `${dpe}:_original.._stime`)));
    keyboard = dpes.map((key, i) => {
        const dpEl_id = winccoa.dpGetId(key);
        const text = winccoa.dpGetDescription(key);
        const unit = winccoa.dpGetUnit(key);
        return [{ text: `${text} ${values[i]} ${unit} ${times[i]}`, callback_data: `set_value:${dpEl_id[0]}:${dpEl_id[1]}:${chatId}` }]
    }
    );
    myBot.sendMessage(chatId, "You are in value set area", { reply_markup: { inline_keyboard: keyboard } });
    myBot.action('set_value', async (query) => {
        const [, dpEl_id1, dpEl_id2, chatId] = query.data.split(':');
        const dpe = winccoa.dpGetName(Number(dpEl_id1), Number(dpEl_id2));
        myBot.sendMessage(chatId, "Enter value to set:");
        if (!myBot.activeChats[chatId]) {
            myBot.activeChats[chatId] = {};
        }
        state[chatId]['state'] = 'awaiting_value';
        state[chatId]['value for set'] = `${dpe}`;
        myBot.action('set_value', null);
        stateManager.setState(state);
    })
}

async function setValue(winccoa, msg, myBot, chatId) {
    let stateManager = new State(winccoa);
    let state = stateManager.getState();

    state[chatId]['state'] = '';
    let key = state[chatId]['value for set'];
    let value = msg.text;
    stateManager.setState(state);
    let dpType = winccoa.dpElementType(key);
    if (dpType === WinccoaElementType.Bool) {
        let b = !(value.toLowerCase() === "false") && !(value.toLowerCase() === "0");
        await winccoa.dpSet(`${key}`, b);
        return;
    }
    await winccoa.dpSet(`${key}`, value);
    myBot.sendMessage(chatId, `new value for ${winccoa.dpGetDescription(key)} ${value}`);
}

module.exports.valuesHandlers = valuesHandlers
module.exports.generalValueSet = generalValueSet