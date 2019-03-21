import {ooElement} from './oo.js';
import './ch-timecard.js';
import './ttt-game.js';
import './hero.js';

const templateString = /*html*/`
<ch-timecard></ch-timecard>
<!--<section class="games"> -->
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
<!-- </section> -->
<oo-hero></oo-hero>
`;


class myApp extends ooElement {
    constructor() {
        super(templateString);
        this.refresh();
    }

    //connectedCallback() {

    //}
}

customElements.define('my-app', myApp);