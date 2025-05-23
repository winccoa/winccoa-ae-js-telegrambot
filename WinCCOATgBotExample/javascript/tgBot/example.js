const { WinccoaManager } = require('winccoa-manager');
const winccoa = new WinccoaManager();

const query = `SELECT ALERT '_alert_hdl.._value', '_alert_hdl.._text', '_alert_hdl.._ack_state' FROM 'AAA.**'`

function subsribeOnAlertsQuery() {
    winccoa.dpQueryConnectSingle((values, type, error) => someFunc(values, type, error), true, query);
}

function someFunc(values,type,error)
{
    for (let i = 1; i < values.length; i++) {
        console.log(`dpName: ${values[i][0]} value: ${values[i][2]}, text: ${values[i][3]} ack_state: ${values[i][4]}`);
    }
    
}

subsribeOnAlertsQuery();