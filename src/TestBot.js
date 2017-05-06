import assert from "assert";
import Promise from "bluebird";

export default function TestBot(bot, ...args) {
    return new (class TestBot extends bot {
        constructor(...args) {
            super(...args)

            this.messages = [];
            this.awaiting = [];
            this.debug = true;
        }

        awaitMessage() {
            if(this.messages.length) {
                return Promise.resolve(this.messages.shift());
            }

            return new Promise((resolve, reject) => {
                this.messages.push({ resolve, reject });
            });
        }

        async expectMessage(expected) {
            const message = await this.awaitMessage();
            assert.deepEqual(message, expected);
        }

        handleMessage(message) {
            console.log(`message received { from ${message.author} } ${message.content}`);
            return super.handleMessage(message);
        }

        sendMessage(message) {
            console.log(`sending message: { to ${message.to} } ${message.content}`);
            if(this.awaiting.length) {
                this.awaiting.shift().resolve(message);
            } else {
                this.messages.push(message);
            }

            return Promise.resolve();
        }
    })(...args);
}