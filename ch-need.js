import {ooElement} from './oo.js';

const templateString = /*html*/`
<style>
    :host {
        display: block;
    }

    :host.is-new {
        border: 1px solid #ff9900;
    }

    label {
        display: block;
        font-size: 12px;
    }

    .flex-lr {
        display: flex;
        justify-content: space-between;
    }

    .flex-lr label {
        padding: 0 3px;
    }

    .flex-lr select {
        margin: 1px 2px;
    }

    .needs li[data-service="1"] {
        background-color: #dbedf5;
    }

    .needs li[data-service="2"] {
        background-color: #baf8d4;
    }

    .needs li[data-service="3"] {
        background-color: #d1d1ff;
    }

    .needs li[data-new="true"] {
        border: 1px solid yellow;
    }

    select {
        background: #ffffff;
        border: 1px solid lightgrey;
        font-size: 12px;
    }

    .changed {
        background: rgba(255, 255, 0, 0.59);
    }

    .date-header {
        font-size: 12px;
    }

    .service {
        background-color: inherit;
        color: inherit;
        border: none;
        width: 100%;
        border-bottom: 1px solid;
        font-weight: bold;
        font-size: 12px;
    }

    .service:disabled {
        -webkit-appearance: none;
    }

    .is-new {
        display: block;
    }

    .add-new {
        font-size: 12px;
        display: block;
        width: 100%;
        margin: 4px 0;
    }

    .toolbar {
        display: flex;
    }

    .toolbar button {
        font-size: 12px;
        flex: 0 1 50%;
        padding: 1px;
    }

    .adj-container button {
        font-size: 11px;
        margin: 1px 0;
        padding: 0px 5px;
    }

    .adj-container {
        margin: 0 2px;
        display: inline-flex;
    }
</style>

<div>
    <div class="flex-lr" oo-if="this.shouldShowDetails()">
        <label>Service: </label>
        <select [value]='this.needdata.service' [disabled]="!this.needdata.isNew" [onchange]='(e) => this.serviceOnChange(this, e.target.value)'>
            <option oo-for='this.servicelist' [value]="item.value">{{item.name}}</option>
        </select>
    </div>

    <div class="flex-lr" oo-if="this.shouldShowDetails()">
            <label>Payer:</label>
            <select [value]="item.payerId" [onchange]='(e) => this.payerOnChange(e.target.value)' [disabled]="!item.isNew">
                <option oo-for="this.payers" [value]="item.value">{{item.name}}</option>
            </select>
    </div>

    <div class="flex-lr">
        <label oo-if="this.shouldShowDetails()">Duration:</label>
        <label oo-if="!this.shouldShowDetails()">{{this.services[this.needdata.service - 1].name}}:</label>
        <div class="adj-container">
            <label {class}="this.durationClass()">{{this.needdata.duration}}hrs</label>
            <button [disabled]="this.allowremovetime" [onclick]="(e) => this.addTime(item, context, 900000)">+</button>
            <button [disabled]="this.needdata.duration == 0" [onclick]="(e) => this.addTime(item, context, -900000)">-</button>
        </div>
    </div>
</div>
`;


class chNeed extends ooElement {
    constructor() {
        super(templateString);
    }

    shouldShowDetails() {
        return (this.showdetails || this.needdata.isNew);
    }

    payerOnChange(value) {
        this.needdata.payerId = value;
    }

    serviceOnChange(value) {
        this.needdata.service = value;
        this.boundRoot.refresh();
    }

    addTime(item, context, timeDiff) {
        this.changeService(context.parent.item, item.service, timeDiff);
        context.parent.item.out = this.calcShiftOut(context.parent.item);
        context.parent.item.duration = this.calcDuration(context.parent.item);
        this.boundRoot.refresh();
    }

    durationClass() {
        if(this.needdata.isNew || (this.needdata.needDuration && this.needdata.needDuration != this.needdata.duration))
            return 'changed';
    }

    jobClass() {
        let myClass =  ['companion', 'personal', 'home'][this.needdata.service - 1];
        if(this.needdata.isNew)
            myClass += ' is-new';

        return myClass;
    }

    calcDuration() {
        return Math.abs(this.needdata.out - this.needdata.in) / 36e5;
    }
}

customElements.define('ch-need', chNeed);