import {freshElement} from './fresh.js';
//import './ch-need.js';
const templateString = /*html*/`
<style>
    :host {
        border: 1px solid #3d3d3d;
        padding: 0;
        border-top-left-radius: 3px;
        border-top-right-radius: 3px;
        display: block;
    }

    header {
        background: #3d3d3d;
        font-size: 12px;
        color: #fff;
        font-weight: bold;
        text-align: center;
    }

    .needs {
        list-style-type: none;
        padding: 0;
        margin: 0;
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

    .total .changed {
        color: yellow;
        background: inherit;
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

    .total {
        color: rgb(255, 255, 255);
        background: #575757;
        font-size: 11px;
        font-weight: bold;
    }

    .close {
        margin: 0 0 0 4px;
        font-size: 9px;
        padding: 1px 4px 0px 4px;
        display: none;
    }

    .is-new .close {
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
<header>Shift {{this.shiftnum}}</header>
<div class="flex-lr">
    <label>In:</label>
    <select [.value]="this.shift.in.toJSON()">
        <option fjs-for="time in this.times" [.value]="time.value">{{time.text}}</option>
    </select>
</div>

<div class="flex-lr">
    <label>Out:</label>
    <select [.value]="this.shift.out.toJSON()">
        <option fjs-for="time in this.times" [.value]="time.value">{{time.text}}</option>
    </select>
</div>
<div class="total flex-lr">
    <label>Shift Total:</label>
    <label>{{this.shift.duration}}hrs</label>
</div>
<ol class="needs">
    <!--li fjs-for="this.shiftData.jobs" {data-service}="item.service" {data-new}="item.isNew">
        <ch-need [showdetails]="this.showDetails || this.shiftdata.isNew" [services]="this.services" [servicelist]="this.getRemainingServices(item)" [needdata]="item" [payers]="this.payers" [allowremovetime]="this.shiftdata.out.getTime() == this.shiftdata.maxTime.getTime()"></ch-need>
    </li-->
</ol>

<!--div class="toolbar">
    <button [onclick]="(e) => this.toggleDetails()">{{this.showDetails ? 'Hide' : 'Show'}} Details</button>
    <button [disabled]="this.shiftdata.jobs.length >= 3" [onclick]="(e) => this.addService()">Add Service</button>
</div-->
`;


class chTimeCardShift extends freshElement {
    constructor() {
        super(templateString);
    }
}

customElements.define('ch-timecard-shift', chTimeCardShift);