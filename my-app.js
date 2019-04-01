import {freshElement} from './fresh.js';
//import './ch-timecard.js';
import './ttt-game.js';
//import './hero.js';

const templateString = /*html*/`
<ttt-game></ttt-game>
<ttt-game></ttt-game>
<ttt-game></ttt-game>
<ttt-game></ttt-game>
<ttt-game></ttt-game>
<ttt-game></ttt-game>
<ttt-game></ttt-game>
<ttt-game></ttt-game>
<ttt-game></ttt-game>
<ttt-game></ttt-game>
<ttt-game></ttt-game>
<ttt-game></ttt-game>
<ttt-game></ttt-game>
<ttt-game></ttt-game>
<ttt-game></ttt-game>
<ttt-game></ttt-game>
<ttt-game></ttt-game>
<ttt-game></ttt-game>
<ttt-game></ttt-game>
<ttt-game></ttt-game>
<ttt-game></ttt-game>
<ttt-game></ttt-game>
<ttt-game></ttt-game>
<ttt-game></ttt-game>
<ttt-game></ttt-game>
<ttt-game></ttt-game>
<ttt-game></ttt-game>
<ttt-game></ttt-game>
<ttt-game></ttt-game>
<ttt-game></ttt-game>
<ttt-game></ttt-game>
<ttt-game></ttt-game>
<ttt-game></ttt-game>
<ttt-game></ttt-game>
<ttt-game></ttt-game>
<ttt-game></ttt-game>
<ttt-game></ttt-game>
<ttt-game></ttt-game>
<ttt-game></ttt-game>
<ttt-game></ttt-game>
<ttt-game></ttt-game>
<ttt-game></ttt-game>
<ttt-game></ttt-game>
<ttt-game></ttt-game>
<ttt-game></ttt-game>
<ttt-game></ttt-game>
<ttt-game></ttt-game>
<ttt-game></ttt-game>
<ttt-game></ttt-game>
<ttt-game></ttt-game>
<ttt-game></ttt-game>
<ttt-game></ttt-game>
<ttt-game></ttt-game>
<ttt-game></ttt-game>
<ttt-game></ttt-game>
<ttt-game></ttt-game>
<ttt-game></ttt-game>
<ttt-game></ttt-game>
<ttt-game></ttt-game>
<ttt-game></ttt-game>
<ttt-game></ttt-game>
<ttt-game></ttt-game>
<ttt-game></ttt-game>
<ttt-game></ttt-game>
<ttt-game></ttt-game>
<ttt-game></ttt-game>
<ttt-game></ttt-game>
<ttt-game></ttt-game>
<ttt-game></ttt-game>
<ttt-game></ttt-game>
<ttt-game></ttt-game>
<ttt-game></ttt-game>
<ttt-game></ttt-game>
<ttt-game></ttt-game>
<ttt-game></ttt-game>
<ttt-game></ttt-game>
<ttt-game></ttt-game>
<ttt-game></ttt-game>
<ttt-game></ttt-game>
<ttt-game></ttt-game>
<ttt-game></ttt-game>
<ttt-game></ttt-game>
<ttt-game></ttt-game>
<ttt-game></ttt-game>
<ttt-game></ttt-game>
<ttt-game></ttt-game>
<ttt-game></ttt-game>
<ttt-game></ttt-game>
<ttt-game></ttt-game>
<ttt-game></ttt-game>
<ttt-game></ttt-game>
<ttt-game></ttt-game>
<ttt-game></ttt-game>
<ttt-game></ttt-game>
<ttt-game></ttt-game>
<ttt-game></ttt-game>
<ttt-game></ttt-game>
<ttt-game></ttt-game>
<ttt-game></ttt-game>
<ttt-game></ttt-game>
<ttt-game></ttt-game>
<ttt-game></ttt-game>
`;

class myApp extends freshElement {
    constructor() {
        super(templateString);
        this.refresh();
    }
}

customElements.define('my-app', myApp);