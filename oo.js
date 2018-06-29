const emptyString = '\u200B';
const factories = {};
const bindingPattern = /{{\s*([^}]+)\s*}}/g;
const emptyArray = [];

class boundElementFactory {
    constructor(element) {
        this.children = [];
        this.binders = [];
        this.nodeCounts = [-1];
        this.level = 0;
        this.parents = [element];
        this.template = element;

        this.bindNodes(element);
    }

    makeAcc() {
        if(this.nodeCounts[0] === -1)
            return function(node){ return node; };

        return new Function('node', 'return node.childNodes[' + this.nodeCounts.slice(0, this.level + 1).join('].childNodes[') + '];');
    }

    makeFuncFromString(evalStr) {
        return new Function('item', 'context', 'return (' + evalStr + ');');
    }

    getParentNextSibling(tw) {
        if(tw.parentNode() === null)
            return null;

        return tw.nextSibling() || this.getParentNextSibling(tw);
    }

    bindNodes(currentNode) {
        let _this = this;
        let _prev = null;
        let walker = document.createTreeWalker(
            currentNode,
            NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_COMMENT,
            {
                acceptNode: function(node) {
                    if(node.parentNode === _prev) {
                        _this.parents[++_this.level] = _prev;
                        _this.nodeCounts[_this.level] = 0;
                    } else {
                        while(_this.parents[_this.level] !== node.parentNode){
                            _this.level--;
                        }
                        _this.nodeCounts[_this.level]++;
                    }

                    _prev = node;

                    if(node.nodeType === 3)
                        return node.nodeValue.length < 5 ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT;

                    if(node.nodeType === 8)
                        return NodeFilter.FILTER_REJECT;

                    if(node.nodeName === 'STYLE' || node.NodeName === 'SCRIPT')
                        return NodeFilter.FILTER_REJECT;

                    return NodeFilter.FILTER_ACCEPT;
                }
            },
            false);

        let childBinder, accessorFunc;

        while(currentNode !== null) {
            switch(currentNode.nodeType) {

            case 3:
                this.bindTextNodes(currentNode);
                break;

            case 1:
                childBinder = (currentNode.dataset.show ? new childBinderFactory(showBinder, this.makeAcc(), this.makeFuncFromString(currentNode.dataset.show, true), currentNode, 'data-show') :
                    (currentNode.dataset.rpt ? new childBinderFactory(repeatBinder, this.makeAcc(), this.makeFuncFromString(currentNode.dataset.rpt, true), currentNode, 'data-rpt') : null));

                if(childBinder) {
                    this.children.push(childBinder);
                    currentNode = walker.nextSibling() || this.getParentNextSibling(walker);
                    continue;
                }

                accessorFunc = null;

                if(currentNode.attributes.length > 0)
                    accessorFunc = this.bindAttributes(currentNode);

                if(factories[currentNode.localName])
                    this.binders.push(new binderFactory(ooElementBinder, accessorFunc || this.makeAcc()));

                break;
            }
            currentNode = walker.nextNode();
        }

        for(let i = 0; i < this.children.length; i++)
            this.children[i].init();
    }

    bindTextNodes(node) {
        let match, matchNode, isEnd;

        while((match = bindingPattern.exec(node.nodeValue)) != null) {
            matchNode = node;
            isEnd = false;
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
        let attrName, binderType, accessorFunc;

        // loop in reverse, so we can remove attributes while still looping
        for(let i = element.attributes.length - 1; i >= 0; i--) {
            attrName = element.attributes[i].name;

            binderType = (attrName[0] === '[' && attrName[attrName.length - 1] === ']' ? propBinder :
                (attrName[0] === '{' && attrName[attrName.length - 1] === '}' ? attrBinder : null));

            accessorFunc = accessorFunc || this.makeAcc();

            if(binderType) {
                this.binders.push(
                    new binderFactory(
                        binderType,
                        this.makeAcc(),
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
        let newBe = new boundElement(this.template.cloneNode(true), owner);

        for(let i = 0, len = this.children.length; i < len; i++)
            newBe.children.push(this.children[i].build(newBe.element, owner));

        for(let i = 0, len = this.binders.length; i < len; i++)
            newBe.binders.push(this.binders[i].build(newBe.element, owner));

        return newBe;
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
            for(let i = newLength; i < this.prevLength; i++) {
                try { this.rows[i].element.remove(); }
                catch(error){ /* for some reason Edge throws an exception when removing */  }
            }
        }

        this.prevLength = newLength;
    }
}

class ooElementBinder extends binder {
    constructor(element) {
        super(element, null, null);
    }

    process() {
        if(this.node.refresh)
            this.node.refresh();
    }
}

class boundElement {
    constructor(element, owner) {
        this.owner = owner;
        this.binders = [];
        this.children = [];
        this.element = element;
    }

    refresh(context, suppressChildRefresh) {
        context = context || {};

        if(!suppressChildRefresh) {
            for(let i = 0, len = this.children.length; i < len; i++)
                this.children[i].process(this.owner, context);
        }

        for(let i = 0, len = this.binders.length; i < len; i++)
            this.binders[i].process(this.owner, context);
    }
}

export class ooElement extends HTMLElement {
    constructor() {
        super();

        this.hasTemplate = factories[this.localName] !== undefined;

        if (this.hasTemplate) {
            this.boundRoot = factories[this.localName].build(this);
            this.attachShadow({mode: 'open'}).appendChild(this.boundRoot.element);
        }
    }

    connectedCallback() {
        if(window.ShadyCSS && this.hasTemplate)
            window.ShadyCSS.styleElement(this);
    }

    refresh() {
        if(this.hasTemplate)
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