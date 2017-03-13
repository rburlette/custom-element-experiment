class SvgIcon extends HTMLElement {
    constructor() {
        super();

        this.sRoot = this.attachShadow({
            mode: 'closed'
        });

        this.styleDOM = `
            <style>
                :host {
                    display: flex;
                }

                .icon {
                    display: inline-block;
                    width: 1em;
                    height: 1em;
                    stroke-width: 0;
                    stroke: currentColor;
                    fill: currentColor;
                }

                .icon-images {
                    width: 1.125em;
                }

                .icon-connection {
                    width: 1.25em;
                }

                .icon-books {
                    width: 1.125em;
                }

                .icon-library {
                width: 1.0625em;
                }

                .icon-price-tags {
                    width: 1.25em;
                }

                .icon-history {
                    width: 1.0625em;
                }

                .icon-keyboard {
                    width: 1.125em;
                }

                .icon-bubbles {
                    width: 1.125em;
                }

                .icon-bubbles2 {
                width: 1.125em;
                }

                .icon-bubbles3 {
                    width: 1.125em;
                }

                .icon-bubbles4 {
                    width: 1.125em;
                }

                .icon-users {
                    width: 1.125em;
                }

                .icon-menu2 {
                    width: 1.375em;
                }

                .icon-menu3 {
                    width: 1.375em;
                }

                .icon-menu4 {
                    width: 1.375em;
                }

                .icon-volume-high {
                    width: 1.0625em;
                }

                .icon-embed2 {
                    width: 1.25em;
                }

                .icon-youtube2 {
                    width: 2.5087890625em;
                }

            </style>`;
    }

    static get observedAttributes() {
        return [
            'icon'
        ];
    }

    attributeChangedCallback(name, oldValue, newValue, namespaceURI) {

        switch (name) {
            case 'icon':
                this.handleIconChange(newValue);
                break;
        }
    }

    handleIconChange(newValue) {
        this.sRoot.innerHTML = this.styleDOM + '<svg class="icon icon-' + newValue + '"><use xlink:href="symbol-defs.svg#icon-' + newValue + '"></use></svg>';
    }
}
customElements.define('svg-icon', SvgIcon);

class AlertBox extends HTMLElement {
    constructor() {
        super();

        this.sRoot = this.attachShadow({
            mode: 'closed'
        });

        this.sRoot.innerHTML = `
            <style>
                :host {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    padding: .6rem 1.1rem;
                    border: 1px solid lightgrey;
                    border-radius: .25rem;
                }

                button:hover {
                    background-color: rgba(255, 255, 255, 0.35);
                    border-color: inherit;
                }

                button {
                    color: inherit;
                    border: none;
                    background-color: inherit;
                    font-size: .6em;
                    padding: .8em;
                    border: 1px solid transparent;
                    border-radius: .25rem;
                }
            </style>
            <span><slot></slot></span>`;

        this.message = this.sRoot.querySelector('span');
    }

    static get observedAttributes() {
        return [
            'dismissable'
        ];
    }

    attributeChangedCallback(name, oldValue, newValue, namespaceURI) {

        switch (name) {
            case 'dismissable':
                this.handleDismissable(newValue);
                break;
        }
    }

    handleDismissable(value) {
        if (value !== null) {
            var button = document.createElement('button');
            button.innerHTML = '<svg-icon icon="cross"></svg-icon>';
            this.closeButton = this.sRoot.appendChild(button);

            let instance = this;
            this.closeButton.addEventListener("click", function() {
                instance.close();
            });
        } else {
            this.closeButton.parentNode.removeChild(this.closeButton);
        }
    }

    close() {
        this.parentNode.removeChild(this);
    }
}
customElements.define('alert-box', AlertBox);

class ModalBox extends HTMLElement {
    constructor() {
        super();

        this.sRoot = this.attachShadow({
            mode: 'closed'
        });

        this.sRoot.innerHTML = `
            <style>
                :host {
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    position: fixed;
                    top: 0;
                    left: 0;
                    bottom: 0;
                    right: 0;
                    overflow: none;
                    background: rgba(100, 100, 100, .15);
                    animation: fadein 1.5s;
                }

                @keyframes fadein {
                    from {
                        opacity: 0;
                    }
                    to {
                        opacity: 1;
                    }
                }

                section {
                    background-color: #fff;
                    display: flex;
                    flex-direction: column;
                    max-height: 90%;
                    overflow: hidden;
                    box-shadow: 0 5px 15px rgba(0, 0, 0, .5);
                    min-width: 50%;
                    max-width: 90%;
                    border-radius: .25rem;
                }

                h1 {
                    margin: 0;
                    padding: 5px 15px;
                    border-bottom: 1px solid lightgrey;
                    display: inline-block;
                    flex: 0 0 auto;
                }

                main {
                    flex: 0 1 auto;
                    display: inline-block;
                    overflow: auto;
                    padding: 10px;
                }
            </style>
            <section>
                <h1>Modal</h1>
                <main>      
                    <div>
                        <slot></slot>
                    </div>
                </main>
            </section>`;
        this.message = this.sRoot.querySelector('span');
    }

    static get observedAttributes() {
        return [
            'dismissable'
        ];
    }

    attributeChangedCallback(name, oldValue, newValue, namespaceURI) {
        switch (name) {
            case 'dismissable':
                this.handleDismissable(newValue);
                break;
        }
    }

    handleDismissable(value) {
        if (value !== null) {
            var button = document.createElement('button');
            button.innerHTML = 'x';
            this.closeButton = this.sRoot.appendChild(button);
            this.addEventListener("click", this.close);
        } else {
            this.closeButton.parentNode.removeChild(this.closeButton);
        }
    }

    close() {
        this.parentNode.removeChild(this);
    }
}
customElements.define('modal-box', ModalBox);