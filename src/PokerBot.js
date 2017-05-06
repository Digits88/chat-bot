/** @jsx Rule */
import {
    Bot,
    Rule,
    Mention,
    Command,
    From
} from "./lib/react";

export default class PokerBot extends Bot {
    constructor(props) {
        super(props);

        const { room, moderator, participants } = props;

        this.state = {
            room,
            moderator,
            participants,
            state: "waiting",
            currentRound: null,
            rounds: {
                pending: [],
                completed: [],
                skipped: []
            }
        };
    }

    render() {
        console.log(this);
        return this.renderModerator(this.state);
    }

    renderModerator(state) {
        const inputs = [];

        switch(state.state) {
            case "waiting":
                inputs.push(<Command name="plan" handler={this.plan.bind(this)} />);
            break;

            case "ready":
                inputs.push(
                    <Command name="start" handler={this.start} />
                );
            break;
        }

        return (
            <From user={state.moderator}>
                { inputs}
                <Command name="add" handler={this.addUser} />
                <Command name="remove" handler={this.removeUser} />
            </From>
        );
    }

    reduce(state, action) {
        switch(action.type) {
            case "PLAN":
                const { tasklist } = action.payload;

                return  {
                    ...state,
                    state: "ready",
                    tasklist
                };
            break;

            default:
                return state;
        }
    }

    plan({ content, author }) {
        // Attempt to validate the tasklist
        if(!content.match(/teamwork.com/)) {
            return this.sendMessage({
                content: "Uh oh, I don't recognize that tasklist!",
                to: author
            });
        }

        // Grab the tasks from the API and create the rounds

        return this.dispatch("PLAN", { tasklist: content });
    }

    addUser() {}
    removeUser() {}
    start() {}
}