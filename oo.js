const emptyString = '\u200B';
const factories = {};
const bindingPattern = /{{\s*([^}]+)\s*}}/g;
const emptyArray = [];

class boundElementFactory {
    constructor(element) {
        this.binders = [];
        this.nodeCounts = new Array(100);
        this.level = -1;
        this.template = element;
        this.bindNodes(element);
    }

    bindNodes(currentNode) {
        let children = [];
        let nodeStack = [currentNode];
        let walker = document.createTreeWalker(
            currentNode,
            NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_COMMENT,
            {
                acceptNode: (node) => {
                    if(node.parentNode === nodeStack[this.level + 1])
                        this.nodeCounts[++this.level] = -1;
                    else while(nodeStack[this.level] !== node.parentNode)
                        this.level--;

                    nodeStack[this.level + 1] = node;
                    this.nodeCounts[this.level]++;

                    switch(node.nodeType) {
                    case 8:
                        return NodeFilter.FILTER_REJECT;
                    case 1:
                        if(node.localName === 'style' || node.localName === 'script')
                            return NodeFilter.FILTER_REJECT;

                        if(node.dataset.show ? children.push(new childBinderFactory(showBinder, this.nodeCounts, this.level, node.dataset.show, node, 'data-show')) :
                            node.dataset.rpt ? children.push(new childBinderFactory(repeatBinder, this.nodeCounts, this.level, node.dataset.rpt, node, 'data-rpt')) : false)
                            return NodeFilter.FILTER_REJECT;
                    }

                    return NodeFilter.FILTER_ACCEPT;
                }
            },
            false);

        do {
            switch(currentNode.nodeType) {
            case 3:
                this.bindTextNodes(currentNode);
                continue;
            case 1:
                this.bindElement(currentNode);
                continue;
            }
        } while ((currentNode = walker.nextNode()) !== null);

        children.forEach(c => c.init());

        this.binders = [...children, ...this.binders];
    }

    bindTextNodes(node) {
        let match;

        while((match = bindingPattern.exec(node.nodeValue)) !== null) {
            let lastOffset = node.nodeValue.length - bindingPattern.lastIndex;

            let matchNode = match.index > 0 ? this.splitTextNode(node, match.index) : node;
            this.binders.push(new binderFactory(textBinder, this.nodeCounts, this.level, match[1]));
            node = lastOffset > 0 ? this.splitTextNode(matchNode, matchNode.nodeValue.length - lastOffset) : matchNode;

            matchNode.nodeValue = emptyString;
        }
    }

    splitTextNode(node, offset) {
        this.nodeCounts[this.level]++;
        return node.splitText(offset);
    }

    bindElement(element) {
        // loop in reverse, so we can remove attributes while still looping
        for(let i = element.attributes.length - 1; i >= 0; i--) {
            let attrName = element.attributes[i].name;

            let binderType = (attrName[0] === '[' && attrName[attrName.length - 1] === ']' ? propBinder :
                (attrName[0] === '{' && attrName[attrName.length - 1] === '}' ? attrBinder : null));

            if(binderType) {
                this.binders.push(
                    new binderFactory(
                        binderType,
                        this.nodeCounts,
                        this.level,
                        element.attributes[i].value,
                        attrName.substring(1, attrName.length - 1)
                    )
                );
                element.removeAttribute(attrName);
            }
        }

        if(factories[element.localName])
            this.binders.push(new binderFactory(ooElementBinder, this.nodeCounts, this.level));
    }

    build(owner) {
        return new boundElement(this.template.cloneNode(true), owner, this.binders);
    }
}

class binderFactory {
    constructor(binderType, nodeCounts, level, evalStr, data) {
        this.binderType = binderType;
        this.data = data;

        for(var accStr = 'return node', i = 0; i <= level; i++)
            accStr += ('.childNodes[' + nodeCounts[i] + ']');

        this.nodeAccessor = new Function('node', accStr + ';');

        if(evalStr)
            this.evalFunc = new Function('item', 'context', 'return (' + evalStr + ');');
    }

    build(root) {
        return new this.binderType(this.nodeAccessor(root), this.evalFunc, this.data);
    }
}

class childBinderFactory extends binderFactory {
    constructor(binderType, nodeCounts, level, evalStr, element, attributeName) {
        super(binderType, nodeCounts, level, evalStr);
        this.element = element;
        this.parentNode = element.parentNode;
        this.nextSibling = document.createComment(attributeName);
        element.removeAttribute(attributeName);
    }

    init() {
        this.parentNode.insertBefore(this.nextSibling, this.element.nextSibling);
        this.element.remove();
        this.binderFactory = new boundElementFactory(this.element);
    }

    build(root, owner) {
        return new this.binderType(this.nodeAccessor(root), this.evalFunc, this.binderFactory, owner);
    }
}

class binder {
    constructor(node, evalFunc, defaultValue) {
        this.node = node;
        this.evalFunc = evalFunc;
        this.oldValue = this.defaultValue = defaultValue;
    }

    hasChanged(newValue) { return newValue !== this.oldValue; }

    process(thisArg, context) {
        let newValue = this.defaultValue;
        try { newValue = this.evalFunc.call(thisArg, context ? context.item : undefined, context); }
        catch(err) { newValue = this.defaultValue; }

        if(this.hasChanged(newValue))
            this.update(newValue, context);

        this.oldValue = newValue;
    }
}

class propBinder extends binder {
    constructor(element, evalFunc, propName) {
        super(element, evalFunc, null);
        this.propName = propName;
    }

    update(newValue) {
        this.node[this.propName] = newValue;
    }
}

class attrBinder extends binder {
    constructor(element, evalFunc, attrName) {
        super(element, evalFunc, null);
        this.attrName = attrName;
    }

    update(newValue) {
        if(newValue === null)
            this.node.removeAttribute(this.attrName);
        else
            this.node.setAttribute(this.attrName, newValue);
    }
}

class textBinder extends binder {
    constructor(textNode, evalFunc) {
        super(textNode, evalFunc, emptyString);
    }

    update(newValue) {
        this.node.nodeValue = newValue === null ? emptyString : newValue;
    }
}

class childBinder extends binder {
    constructor(element, evalFunc, factory, owner) {
        super(element, evalFunc, false);
        this.factory = factory;
        this.owner = owner;
    }
    hasChanged() { return true; }
}

class showBinder extends childBinder {
    constructor(element, evalFunc, factory, owner) {
        super(element, evalFunc, factory, owner, false);
        this.boundElement = factory.build(owner);
    }

    update(newValue, context) {
        if(newValue) this.boundElement.refresh(context);

        if(newValue === this.oldValue) return;

        if(newValue)
            this.node.parentNode.insertBefore(this.boundElement.element, this.node);
        else
            this.boundElement.element.remove();
    }
}

class repeatBinder extends childBinder {
    constructor(element, evalFunc, factory, owner) {
        super(element, evalFunc, factory, owner, emptyArray);
        this.prevLength = 0,
        this.rows = new Array(100);
    }

    update(newValue, context) {
        for(let i = 0; i < newValue.length; i++) {
            this.rows[i] = this.rows[i] || this.factory.build(this.owner);

            this.rows[i].refresh({
                parent: context,
                item: newValue[i],
                index: i,
                itemBinder: this.rows[i],
                repeatBinder: this
            });

            if(i >= this.prevLength)
                this.node.parentNode.insertBefore(this.rows[i].element, this.node);
        }

        for(let i = newValue.Length; i < this.prevLength; i++)
            this.rows[i].element.remove();

        this.prevLength = newValue.length;
    }
}

class ooElementBinder extends binder {
    process() {
        this.node.refresh();
    }
}

class boundElement {
    constructor(element, owner, binders) {
        this.element = element;
        this.owner = owner;
        this.binders = binders.map(b => b.build(element, owner));
    }

    refresh(context) {
        this.binders.forEach(binder => binder.process(this.owner, context || {}));
    }
}

export class ooElement extends HTMLElement {
    constructor() {
        super();

        this.boundRoot = factories[this.localName].build(this);
        this.attachShadow({mode: 'open'}).appendChild(this.boundRoot.element);
    }

    connectedCallback() {
        if(window.ShadyCSS)
            window.ShadyCSS.styleElement(this);
    }

    refresh() {
        this.boundRoot.refresh();
    }

    static define(name, constructor, templateString) {
        const template = document.createElement('template');
        template.innerHTML = templateString;

        if (window.ShadyCSS)
            window.ShadyCSS.prepareTemplate(template, name);

        factories[name] = new boundElementFactory(template.content);

        customElements.define(name, constructor);
    }
}