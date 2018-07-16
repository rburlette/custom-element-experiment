import {ooElement} from './oo.js';

const templateString = `
<h2>{{this.heroInfo.name.toUpperCase()}} Details</h2>
<div><span>id: </span>{{this.heroInfo.Id}}</div>
<div>
  <label>name:
    <input [value]="this.heroInfo.name" [onkeyup]="(e) => this.onNameChange(e.target.value)" placeholder="name">
  </label>
</div>
`;

class hero extends ooElement {
    constructor() {
        super();
        this.heroInfo = {
            name: 'Windstorm',
            id: 1
        };

    }

    connectedCallback() {
        super.connectedCallback();
        this.refresh();
    }

    onNameChange(value) {
        this.heroInfo.name = value;
        this.refresh();
    }
}

ooElement.define('oo-hero', hero, templateString);