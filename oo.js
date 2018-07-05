const emptyString = '\u200B';
const factories = {};
const bindingPattern = /{{\s*([^}]+)\s*}}/g;
const emptyArray = [];
const defaultNodeAccessor = (node) => node;

class boundElementFactory {
    constructor(element) {
        this.binders = [];
        this.nodeCounts = [];
        this.level = -1;
        this.template = element;
        this.bindNodes(element);
    }

    makeAcc() {
        return this.level === -1 ? defaultNodeAccessor :
            new Function('node', 'return node.childNodes[' + this.nodeCounts.slice(0, this.level + 1).join('].childNodes[') + '];');
    }

    makeFuncFromString(evalStr) {
        return new Function('item', 'context', 'return (' + evalStr + ');');
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

                    if(node.nodeType === 8 || node.nodeName === 'STYLE' || node.nodeName === 'SCRIPT')
                        return NodeFilter.FILTER_REJECT;

                    if(node.nodeType === 1) {
                        if(node.dataset.show)
                            return this.addChildBinder(children, showBinder, node.dataset.show, node, 'data-show');

                        if(node.dataset.rpt)
                            return this.addChildBinder(children, repeatBinder, node.dataset.rpt, node, 'data-rpt');
                    }

                    return NodeFilter.FILTER_ACCEPT;
                }
            },
            false);

        do {
            if(currentNode.nodeType === 3) {
                this.bindTextNodes(currentNode);
                continue;
            }

            let accessorFunc = currentNode.attributes ? this.bindAttributes(currentNode) : null;

            if(factories[currentNode.localName])
                this.binders.push(new binderFactory(ooElementBinder, accessorFunc || this.makeAcc()));

        } while ((currentNode = walker.nextNode()) !== null);

        for(let i = 0; i < children.length; i++)
            children[i].init();

        this.binders = [...children, ...this.binders];
    }

    addChildBinder(children,  binder, evalText, node, attribute) {
        children.push(new childBinderFactory(binder, this.makeAcc(), this.makeFuncFromString(evalText, true), node, attribute));
        return NodeFilter.FILTER_REJECT;
    }

    bindTextNodes(node) {
        let match;

        while((match = bindingPattern.exec(node.nodeValue)) !== null) {
            let matchNode = node;
            let isEnd = false;
            if(bindingPattern.lastIndex < node.nodeValue.length) {
                node = node.splitText(bindingPattern.lastIndex);
                isEnd = true;
            }

            if(match.index > 0) {
                matchNode = matchNode.splitText(match.index);
                this.nodeCounts[this.level]++;
            }

            matchNode.nodeValue = emptyString;

            this.binders.push(
                new binderFactory(
                    textBinder,
                    this.makeAcc(),
                    this.makeFuncFromString(match[1])
                )
            );

            if(isEnd)
                this.nodeCounts[this.level]++;
        }
    }

    bindAttributes(element) {
        let accessorFunc = null;

        // loop in reverse, so we can remove attributes while still looping
        for(let i = element.attributes.length - 1; i >= 0; i--) {
            let attrName = element.attributes[i].name;

            let binderType = (attrName[0] === '[' && attrName[attrName.length - 1] === ']' ? propBinder :
                (attrName[0] === '{' && attrName[attrName.length - 1] === '}' ? attrBinder : null));

            if(binderType) {
                accessorFunc = accessorFunc || this.makeAcc();
                this.binders.push(
                    new binderFactory(
                        binderType,
                        accessorFunc,
                        this.makeFuncFromString(element.attributes[i].value),
                        attrName.substring(1, attrName.length - 1)
                    )
                );
                element.removeAttribute(attrName);
            }
        }

        return accessorFunc;
    }

    build(owner) {
        let newBoundElement = new boundElement(this.template.cloneNode(true), owner, this.binders.length);

        for(let i = 0, len = this.binders.length; i < len; i++)
            newBoundElement.binders[i] = this.binders[i].build(newBoundElement.element, owner);

        return newBoundElement;
    }
}

class binderFactory {
    constructor(binderType, nodeAccessor, evalFunc, data) {
        this.binderType = binderType;
        this.nodeAccessor = nodeAccessor;
        this.evalFunc = evalFunc;
        this.data = data;
    }

    build(root) {
        return new this.binderType(this.nodeAccessor(root), this.evalFunc, this.data);
    }
}

class childBinderFactory extends binderFactory {
    constructor(binderType, nodeAccessor, evalFunc, element, attributeName) {
        super(binderType, nodeAccessor, evalFunc);
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
        catch(err) { /* do nothing if there is an error evaluating binding function */ }

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
        this.rows = [];
    }

    update(newValue, context) {
        let newLength = newValue.length;
        let rowsLength = this.rows.length;

        for(let i = 0, currentRow; i < newLength; i++) {
            if(i >= rowsLength)
                this.rows[i] = this.factory.build(this.owner);

            currentRow = this.rows[i];

            currentRow.refresh({
                parent: context,
                item: newValue[i],
                index: i,
                itemBinder: currentRow,
                repeatBinder: this
            });

            if(i >= this.prevLength)
                this.node.parentNode.insertBefore(currentRow.element, this.node);
        }

        if(newLength < this.prevLength) {
            for(let i = newLength; i < this.prevLength; i++)
                this.rows[i].element.remove();
        }

        this.prevLength = newLength;
    }
}

class ooElementBinder extends binder {
    process() {
        this.node.refresh();
    }
}

class boundElement {
    constructor(element, owner, binderCount) {
        this.owner = owner;
        this.binders = new Array(binderCount);
        this.element = element;
    }

    refresh(context) {
        context = context || {};

        for(let i = 0, len = this.binders.length; i < len; i++)
            this.binders[i].process(this.owner, context);
    }
}

export class ooElement extends HTMLElement {
    constructor() {
        super();

        if (factories[this.localName] !== undefined) {
            this.boundRoot = factories[this.localName].build(this);
            this.attachShadow({mode: 'open'}).appendChild(this.boundRoot.element);
        }
    }

    connectedCallback() {
        if(window.ShadyCSS && this.boundRoot)
            window.ShadyCSS.styleElement(this);
    }

    refresh() {
        if(this.boundRoot)
            this.boundRoot.refresh();
    }

    static define(name, constructor, templateString) {
        if(templateString) {
            const template = document.createElement('template');
            template.innerHTML = templateString;

            if (window.ShadyCSS)
                window.ShadyCSS.prepareTemplate(template, name);

            factories[name] = new boundElementFactory(template.content);
        }

        customElements.define(name, constructor);
    }
}