# [FreshJS](https://github.com/rburlette/freshjs)

FreshJS is a web component based JavaScript library modeled after React for building user interfaces.

* **Inspriation:** FreshJS was inspired by the hundreds of megabytes of npm packages that are required to start a simple React or Angular project. My goal was to make a very small library relying on web standards and that does not require minification or compilation of JSX.
* **Component-Based:** Similar to React, you can build composable components with state and properties.
* **High-Peformance:** Component templates are only processed the first time an element is loaded, and for each individual instance of the element the DOM is quickly cloned afterward. FreshJS avoids traversing the DOM to find element references for each template instance.

## Installation

FreshJS is designed to not require any installation. If you include fresh.js in your project, **you can use FreshJS with any browser that supports v1 web components**.


## Documentation

Documentation is in progress.

## Examples

```js
import {freshElement} from './fresh.js';

const templateString = /*html*/`
<h2>{{this.heroInfo.name.toUpperCase()}} Details</h2>
<div><span>id: </span>{{this.heroInfo.Id}}</div>
<div>
  <label>name:
    <input [.value]="this.heroInfo.name" [.oninput]="e => this.onNameChange(e.target.value)" placeholder="name">
  </label>
  <span fjs-if="this.heroInfo.name == 'bob'">testing</span>
</div>`;

class hero extends freshElement {
    constructor() {
        super(templateString);

        this.heroInfo = {
            name: 'Windstorm',
            Id: 1
        };
    }

    onNameChange(value) {
        this.heroInfo.name = value;
        this.refresh();
    }
}

customElements.define('fjs-hero', hero);
```

This example recreates the Hero Editor component in the Angular tutorial.