import {ooElement} from './oo.js';
import './ch-timecard-shift.js';
const templateString = /*html*/`
<style>
    :host {
        flex: 1 1 auto;
    }

    ol {
        list-style-type: none;
        padding: 0;
        margin: 0;
    }

    li {
        margin: 4px 0;
    }

    h4, h6 {
        margin: 0;
        padding: 0;
    }
</style>
<header>
    <h4>{{this.daydata.day}}</h4>
    <h6>{{this.formatDate(this.daydata.date)}}</h6>
</header>
<ol>
    <li oo-for='shift in this.daydata.shifts'>
        <ch-timecard-shift .shift="{shift}" .services="{this.services}" .payers="{this.payers}" .shiftnum=" {index + 1}" .times="{this.daydata.times}" ></ch-timecard-shift>
    </li>
</ol>
`;


class chTimeCardDay extends ooElement {
    constructor() {
        super(templateString);
    }

    formatDate(date) {
        return (date.getMonth() + 1) + '/' + date.getDate() + '/' + date.getFullYear();
    }
}

customElements.define('ch-timecard-day', chTimeCardDay);