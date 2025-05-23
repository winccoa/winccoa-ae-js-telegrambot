const { TrendsConfigMenuMarkup, TrendsTimeRangesMarkup } = require('../utils/menusmarkups');
const { State } = require('../utils/stateManager');
const dpName = "myBot"
const fs = require('fs');
const path = require('path');
const trendHandlers = new Map([
    ["awaiting_trend_name", editTrend],
    ["AVAILABLE_TRENDS", showTimeRanges],
    ["AWAITING_TIMERANGE", sendTrend],
]);

let answeredQueries = new Map();

async function editExistingTrend(winccoa, msg, myBot, chatId) {
    const stateManager = new State(winccoa);
    const state = stateManager.getState();
    if (!state[chatId]) {
        state[chatId] = {};
    }
    if (!state[chatId]["trends"]) {
        state[chatId]["trends"] = {};
    }
    const keys = Object.keys(state[chatId]["trends"]);
    const keyboard = keys.map((key) => [{ text: `Edit ${key}`, callback_data: `edit:${key}:${chatId}` }]);
    myBot.sendMessage(chatId, `Choose trend to edit`, { reply_markup: { inline_keyboard: keyboard } });
    myBot.action('edit', async (query) => {
        const [, trendName, chatId] = query.data.split(':');
        if (answeredQueries.has(query.id)) return;
        myBot.action('edit', null);
        editTrendInternal(winccoa, trendName, myBot, chatId)
    });
}
async function editTrend(winccoa, msg, myBot, chatId) {
    editTrendInternal(winccoa, msg.text, myBot, chatId)
}

async function showTimeRanges(winccoa, msg, myBot, chatId) {
    let stateManager = new State(winccoa);
    let state = stateManager.getState();
    if (!state[chatId]) {
        state[chatId] = {};
    }
    if (!state[chatId]["requestedTrend"]) {
        state[chatId]["requestedTrend"] = '';
    }
    state[chatId]["requestedTrend"] = msg.text;
    state[chatId]["state"] = "AWAITING_TIMERANGE";
    stateManager.setState(state);
    const keyboard = TrendsTimeRangesMarkup;
    myBot.sendMessage(chatId, `Choose timerange`, { reply_markup: keyboard });
}

async function sendTrend(winccoa, msg, myBot, chatId) {
    let stateManager = new State(winccoa);
    let state = stateManager.getState();
    if (!state[chatId]) {
        state[chatId] = {};
    }
    if (!state[chatId]["requestedTrend"]) {
        state[chatId]["requestedTrend"] = '';
    }
    const trendName = state[chatId]["requestedTrend"];
    state[chatId]["state"] = "";
    stateManager.setState(state);

    if (trendName === '') return;

    let timeRange = msg.text === "1 Hour" ? 1 * 60 * 60 * 1000 :
        msg.text === "12 Hours" ? 12 * 60 * 60 * 1000 :
            msg.text === "24 Hours" ? 24 * 60 * 60 * 1000 : 0;

    let dpes = state[chatId]['trends'][trendName]['dpes'];
    const endTime = new Date();
    const startTime = new Date(endTime - timeRange);
    let historicalQuery = `SELECT '_original.._value','_original.._stime'  FROM '{${dpes}}' TIMERANGE("${startTime.toISOString()}","${endTime.toISOString()}",1,0)`;
    let result = await winccoa.dpQuery(historicalQuery);
    const data = result.slice(1);
    if (!data.length) {
        myBot.sendMessage(chatId, "There is no data for this period");
        return;
    }
    const groupedData = {};
    data.forEach(([key, value, timestamp]) => {
        if (!groupedData[key]) {
            groupedData[key] = { labels: [], data: [] };
        }
        groupedData[key].labels.push(new Date(timestamp).toLocaleTimeString());
        groupedData[key].data.push(value);
    });

    const datasets = Object.keys(groupedData).map((key) => ({
        label: winccoa.dpGetDescription(key),
        data: groupedData[key].data,
        fill: false,
        borderColor: `rgba(${Math.floor(Math.random() * 255)}, ${Math.floor(
            Math.random() * 255
        )}, ${Math.floor(Math.random() * 255)}, 1)`,
    }));

    const labels = groupedData[Object.keys(groupedData)[0]].labels;

    const chartConfig = {
        type: 'line',
        data: {
            labels: labels,
            datasets: datasets,
        },
        options: {
            title: {
                display: true,
                text: 'Dynamic Data Chart',
            },
        },
    };
    
    const filePath = './chart.png';
    const buff = await generateChart(chartConfig);
    fs.writeFileSync(filePath, buff);
    myBot.sendPhoto(chatId, filePath, `Trend: ${trendName} Timerange: ${msg.text}`);
}

async function editTrendInternal(winccoa, trendName, myBot, chatId) {
    let stateManager = new State(winccoa);
    let state = stateManager.getState();
    if (!state[chatId]) {
        state[chatId] = {};
    }
    if (!state[chatId]["trends"]) {
        state[chatId]["trends"] = {};
    }
    let trend = state[chatId]["trends"][trendName];
    if (!trend) {
        trend = {};
    }
    trend["name"] = trendName;
    state[chatId]["trends"][trendName] = trend;
    stateManager.setState(state);
    let keyboard = await makeReplyMarkup(chatId, winccoa, trend);
    myBot.sendMessage(chatId, `Add/Remove DPEs for trend ${trendName}`, { reply_markup: { inline_keyboard: keyboard } });
    myBot.action('add_dpe', async (query) => {
        const [, dpEl_id1, dpEl_id2, trendName, chatId] = query.data.split(':');
        const dpe = winccoa.dpGetName(Number(dpEl_id1), Number(dpEl_id2));
        if (answeredQueries.has(query.id)) return;
        answeredQueries.set(query.id, '');
        let stateManager = new State(winccoa);
        let state = stateManager.getState();
        if (!state[chatId]["trends"][trendName]["dpes"]) {
            state[chatId]["trends"][trendName]["dpes"] = []
        }
        state[chatId]["trends"][trendName]["dpes"].push(`${dpe}`);
        stateManager.setState(state);
        const newKeyboard = await makeReplyMarkup(chatId, winccoa, state[chatId]["trends"][trendName]);
        myBot.editMessageReplyMarkup(query.message.chat.id, query.message.message_id, { inline_keyboard: newKeyboard });
    });

    myBot.action('delete_dpe', async (query) => {
        const [, dpEl_id1, dpEl_id2, trendName, chatId] = query.data.split(':');
        const dpe = winccoa.dpGetName(Number(dpEl_id1), Number(dpEl_id2));
        if (answeredQueries.has(query.id)) return;
        answeredQueries.set(query.id, '');
        let stateManager = new State(winccoa);
        let state = stateManager.getState();
        let index = state[chatId]["trends"][trendName]["dpes"].indexOf(dpe);
        if (index > -1) {
            state[chatId]["trends"][trendName]["dpes"].splice(index, 1);
        }
        stateManager.setState(state);
        const newKeyboard = await makeReplyMarkup(chatId, winccoa, state[chatId]["trends"][trendName]);
        myBot.editMessageReplyMarkup(query.message.chat.id, query.message.message_id, { inline_keyboard: newKeyboard });
    });
}

async function deleteTrend(winccoa, msg, myBot, chatId) {
    let stateManager = new State(winccoa);
    let state = stateManager.getState();
    if (!state[chatId]) {
        state[chatId] = {};
    }
    if (!state[chatId]["trends"]) {
        state[chatId]["trends"] = {};
    }
    let keys = Object.keys(state[chatId]["trends"]);
    let keyboard = keys.map((key) => [{ text: `delete ${key}`, callback_data: `delete:${key}:${chatId}` }]);
    myBot.sendMessage(chatId, `Choose trend for deleting:`, { reply_markup: { inline_keyboard: keyboard } });
    myBot.action('delete', async (query) => {
        const [, trendName, chatId] = query.data.split(':');
        if (answeredQueries.has(query.id)) return;
        answeredQueries.set(query.id, '');
        let stateManager = new State(winccoa);
        let state = stateManager.getState();
        delete state[chatId]["trends"][`${trendName}`];
        stateManager.setState(state);
        let keys = Object.keys(state[chatId]["trends"]);
        const newKeyboard = keys.map((key) => [{ text: `delete ${key}`, callback_data: `delete:${key}:${chatId}` }]);
        myBot.editMessageReplyMarkup(query.message.chat.id, query.message.message_id, { inline_keyboard: newKeyboard });
    });
}

async function makeReplyMarkup(chatId, winccoa, trend) {
    let availbleDpes = await winccoa.dpGet(`${dpName}.dpesForTrends`);
    availbleDpes = availbleDpes.filter(x => x.includes(chatId))[0].replace(`${chatId}#`, '').split(';').filter(x => x != '');
    let keyboard = availbleDpes.filter(x => !trend["dpes"]?.includes(x)).map((key) =>
        {
            const btnText = winccoa.dpGetDescription(key);
            return [{ text: `add ${btnText}`, callback_data: `add_dpe:${winccoa.dpGetId(key)[0]}:${winccoa.dpGetId(key)[1]}:${trend["name"]}:${chatId}` }]
        });
    const btnsExistedDpes = trend["dpes"]?.map((key) =>
        {
            const btnText = winccoa.dpGetDescription(key);
            return [{ text: `remove ${btnText}`, callback_data: `delete_dpe:${winccoa.dpGetId(key)[0]}:${winccoa.dpGetId(key)[1]}:${trend["name"]}:${chatId}` }] ?? [[]]
        })
    keyboard = keyboard.concat(btnsExistedDpes ?? [[]]);
    keyboard.push([{ text: 'Finish editing', callback_data: 'finedit' }])
    return keyboard;
}
function showAvailableTrends(winccoa, msg, myBot, chatId) {
    let stateManager = new State(winccoa);
    let state = stateManager.getState();
    if (!state[chatId]) {
        state[chatId] = {};
    }
    state[chatId]["state"] = "AVAILABLE_TRENDS";
    stateManager.setState(state);
    let availableTrends = state[chatId]["trends"];
    let keyboard = Object.keys(availableTrends).map((key) => [`${key}`]) ?? [["No available trends"]];
    keyboard.push([{ text: '🏠 Home' }]);
    myBot.sendMessage(chatId, "Available trends", { reply_markup: { keyboard: keyboard } });
}

async function addTrend(winccoa, msg, myBot, chatId) {
    myBot.sendMessage(chatId, "Enter trend name:");
    let stateManager = new State(winccoa);
    let state = stateManager.getState();
    if (!state[chatId]) {
        state[chatId] = {};
    }
    state[chatId]["state"] = "awaiting_trend_name";
    stateManager.setState(state);
}

async function configureTrends(winccoa, msg, myBot, chatId) {
    myBot.sendMessage(chatId, "Trend configs", { reply_markup: TrendsConfigMenuMarkup });
}

async function generateChart(chartConfig) {
    const puppeteer = require('puppeteer');
    const browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();
    const chartJsContent = fs.readFileSync(path.resolve(__dirname, '../utils/chart.js'), 'utf8');
    const strCharConfig = JSON.stringify(chartConfig);
    const html = `
    <html>
    <head>
        <script>${chartJsContent}</script>
    </head>
    <body>
        <canvas id="myChart" width="800" height="600"></canvas>
        <script>
            document.addEventListener('DOMContentLoaded', () => {
            const config = ${strCharConfig};
            const ctx = document.getElementById('myChart').getContext('2d');
            new Chart(ctx, config);
        });
        </script>
    </body>
    </html>
    `;
    await page.goto('about:blank', { waitUntil: 'domcontentloaded' });
    await page.setContent(html, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('canvas');
    const buffer = await page.screenshot();
    await browser.close();
    return buffer;
}

module.exports.showAvailableTrends = showAvailableTrends
module.exports.trendHandlers = trendHandlers
module.exports.configureTrends = configureTrends
module.exports.addTrend = addTrend
module.exports.deleteTrend = deleteTrend
module.exports.editExistingTrend = editExistingTrend