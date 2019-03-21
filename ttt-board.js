import {ooElement} from './oo.js';

const templateString = /*html*/`
<style>
    :host {
        display: flex;
        flex-wrap: wrap;
        width: 100px;
        height: 100px;
    }

    button {
        flex: 1 0 30%;
        background: #fff;
        border: 1px solid #999;
        margin: -1px;
    }

    button:focus {
        outline: none;
    }
</style>
<button oo-for="square in this.squares" .onclick="{ () => this.onsquareclick(index) }">{{square}}</button>
`;

class tttBoard extends ooElement {
    constructor() {
        super(templateString);
    }
}

customElements.define('ttt-board', tttBoard);