let instance = null;
const dpName = "myBot"
class State {
    constructor(oaManager) {
        if (!instance) {
            this.oaManager = oaManager
            this.oaManager.dpGet(`${dpName}.state`).then(x => instance.state = x ? JSON.parse(x) : {});
            instance = this
        }
        return instance
    }
    getState() {
        return instance.state
    }

    setState(state) {
        instance.state = state
        this.oaManager.dpSet(`${dpName}.state`, JSON.stringify(instance.state));
    }
}

module.exports.State = State;