import { inspect } from "util";
import { flatten, difference, cloneDeep } from "lodash";
import Service from "./Service";
import Rule from "./rules/Rule";

export default class Bot extends Rule {
    constructor(props, context = {}) {
        super(props, context);
        this.props = props;
        this.stack = [];
        this.queue = [];
        this.debug = true;

        if(context && context.service) {
            const methods = difference(Object.getOwnPropertyNames(Service.prototype), ["init", "emit", "constructor"]);

            methods.forEach(fn => {
                this[fn] = (...args) => {
                    return this.context.service[fn].apply(this.context.service, args);
                };
            });
        }
    }

    /**
     * Handle an incoming message and pass it through the decision tree. If an
     * action is returned, execute the action (or dispatch).
     *
     * @param  {Object} message Message object. See message object spec.
     * @return {Promise}        Resolves when the action completes.
     */
    async handleMessage(message, debug, level) {
        if(!this.mount) {
            this.initialize();
        }

        const actions = await this.mount.test(message, debug || this.debug, level);

        if(actions) {
            const results = [];

            for(let action of actions) {
                results.push(await action(message));
            }

            return results;
        }
    }

    /**
     * Dispatch an FSA (Flux Standard Action) or alternatively supply your own
     * object action as the first parameter.
     *
     * @param  {String} type    The action type.
     * @param  {Object} payload The action payload.
     * @return {Promise}        Resolves when the state has been reduced and all transitions are complete.
     */
    dispatch(type, payload) {
        if(this.transitioning) {
            return new Promise((resolve, reject) => {
                this.queue.push({ type, payload, resolve, reject });
            });
        }

        const action = typeof type === "object" ? type : { type, payload };
        const mutations = [];
        const nextState = this.reduce(this.state, action, (type, payload = action.payload) => mutations.push({ type, payload }));

        if(this.state === nextState) {
            return Promise.resolve(null);
        }

        return this.transitioning = (async () => {
            for(let mutation of mutations) {
                if(this.debug) {
                    this.logger(`transition: ${mutation.type}`);
                }

                await this.transition(action, this.state, nextState, mutation);
            }
        })().then(() => {
            this.setState(nextState);
            this.transitioning = null;

            if(this.queue.length) {
                const next = this.queue.shift();
                this.dispatch(next.type, next.payload).then(next.resolve, next.reject);
            }
        });
    }

    /**
     * A no-op transition.
     */
    transition(action, currentState, nextState, mutation) {
        return;
    }

    async test(message, debug, level = 0) {
        const transform = this.match(message);
        const match = transform !== false;

        if(!match) {
            return;
        }

        message = Rule.transform(message, transform);

        if(level === 0) {
            const shortMessage = message.content.length > 40 ? message.content.slice(0, 40) + "..." : message.content;
            this.logger(`message: ${shortMessage}`, { indent: level });
        }

        if(debug) {
            this.logger(`bot: ${this.constructor.name}`, { indent: level });
        }

        await this.handleMessage(message, debug, level + 1);

        return false;
    }

    pushState() {
        return this.stack.push(cloneDeep(this.state));
    }

    popState() {
        return this.setState(this.stack.pop());
    }

    toString() {
        return this.constructor.name;
    }

    initialize() {
        this.setState(this.state);
    }

    toJSON() {
        return this.state;
    }
}