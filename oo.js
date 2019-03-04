const factories = {};
const ooElementTree = [];

class boundElementFactory {
    constructor(element) {
        this.binders = [];
        this.nodeCounts = [];
        this.level = -1;
        this.template = element;
        this.bindNodes(element);
    }

    makeNodeFunc() {
        for(var accStr = 'return node', i = 0; i <= this.level; i++)
            accStr += ('.childNodes[' + this.nodeCounts[i] + ']');

        return new Function('node', accStr + ';');
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
                    case 3:
                        return NodeFilter.FILTER_ACCEPT;
                    case 1:
                        if(node.localName === 'style' || node.localName === 'script')
                            return NodeFilter.FILTER_REJECT;

                        if(node.dataset.show) {
                            children.push(new childBinderFactory(showBinder, this.makeNodeFunc(), node, 'show'));
                            return NodeFilter.FILTER_REJECT;
                        }

                        if(node.dataset.rpt) {
                            children.push(new childBinderFactory(repeatBinder, this.makeNodeFunc(), node, 'rpt'));
                            return NodeFilter.FILTER_REJECT;
                        }
                        return NodeFilter.FILTER_ACCEPT;
                    }

                    return NodeFilter.FILTER_REJECT;
                }
            },
            false);

        do {
            if(currentNode.nodeType === 3)
                this.bindTextNodes(currentNode);
            else if(currentNode.nodeType === 1)
                this.bindElement(currentNode);

        } while ((currentNode = walker.nextNode()) !== null);

        for(let i = 0; i < children.length; i++)
            children[i].init();

        this.binders = [...children, ...this.binders];
    }

    bindTextNodes(node) {
        let start, end;
        while((start = node.nodeValue.indexOf('{{')) !== -1 && (end = node.nodeValue.indexOf('}}')) !== -1) {
            let lastOffset = node.nodeValue.length - (end + 2);
            let matchNode = start > 0 ? this.splitTextNode(node, start) : node;
            this.binders.push(new binderFactory(textBinder, this.makeNodeFunc(), matchNode.nodeValue.substring(2, end - start)));
            node = lastOffset > 0 ? this.splitTextNode(matchNode, matchNode.nodeValue.length - lastOffset) : matchNode;
            matchNode.nodeValue = '\u200B';
        }
    }

    splitTextNode(node, offset) {
        this.nodeCounts[this.level]++;
        return node.splitText(offset);
    }

    bindElement(element) {
        // loop in reverse, so we can remove attributes while still looping
        for(let i = element.attributes.length - 1, nodeFunc; i >= 0; i--) {
            let attrName = element.attributes[i].name;

            let binderType = (attrName[0] === '[' && attrName[attrName.length - 1] === ']' ? propBinder :
                (attrName[0] === '{' && attrName[attrName.length - 1] === '}' ? attrBinder : null));

            if(binderType) {
                this.binders.push(
                    new binderFactory(
                        binderType,
                        nodeFunc = nodeFunc || this.makeNodeFunc(),
                        element.attributes[i].value,
                        attrName.substring(1, attrName.length - 1)
                    )
                );
                element.removeAttribute(attrName);
            }
        }
    }

    build(owner) {
        return new boundElement(this.template.cloneNode(true), owner, this.binders);
    }
}

class binderFactory {
    constructor(binderType, nodeFunc, evalStr, data) {
        this.binderType = binderType;
        this.nodeFunc = nodeFunc;
        this.data = data;

        if(evalStr)
            this.evalFunc = new Function('item', 'context', 'return (' + evalStr + ');');
    }

    build(root, owner) {
        return new this.binderType(this.nodeFunc(root), this.evalFunc, this.data, owner);
    }
}

class childBinderFactory extends binderFactory {
    constructor(binderType, nodeFunc, element, datakey) {
        super(binderType, nodeFunc, element.dataset[datakey]);
        this.element = element;
        this.parentNode = element.parentNode;
        this.comment = document.createComment(datakey);
        element.removeAttribute('data-' + datakey);
    }

    init() {
        this.parentNode.insertBefore(this.comment, this.element.nextSibling);
        this.element.remove();
        this.data = new boundElementFactory(this.element);
    }
}

class binder {
    constructor(node, evalFunc, defaultValue) {
        this.node = node;
        this.evalFunc = evalFunc;
        this.defaultValue = defaultValue;
    }

    hasChanged(newValue) { return newValue !== this.oldValue; }

    process(thisArg, context) {
        try { 
            var newValue = this.evalFunc.call(thisArg, context ? context.item : undefined, context); 
        }
        catch(err) { }

        if(newValue == null)
            newValue = this.defaultValue;

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

    process(thisArg, context) {
        if(typeof(this.oldValue) !== 'function')
            super.process(thisArg, context);
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
        super(textNode, evalFunc, '\u200B');
    }

    update(newValue) {
        this.node.nodeValue = newValue;
    }
}

class childBinder extends binder {
    constructor(element, evalFunc, defaultValue, factory, owner) {
        super(element, evalFunc, defaultValue);
        this.factory = factory;
        this.owner = owner;
    }
    hasChanged() { return true; }
}

class showBinder extends childBinder {
    constructor(element, evalFunc, factory, owner) {
        super(element, evalFunc, false, factory, owner);
        this.boundElement = factory.build(owner);
    }

    update(newValue, context) {
        if(newValue) this.boundElement.refresh(context);

        if(newValue === this.oldValue) return;

        if(newValue) {
            this.node.parentNode.insertBefore(this.boundElement.element, this.node);
            this.boundElement.notifyInsert();
        }
        else
            this.boundElement.element.remove();
    }
}

class repeatBinder extends childBinder {
    constructor(element, evalFunc, factory, owner) {
        super(element, evalFunc, [], factory, owner);
        this.prevLength = 0,
        this.rows = [];
    }

    update(newValue, context) {
        for(let i = 0; i < newValue.length; i++) {
            this.rows[i] = this.rows[i] || this.factory.build(this.owner);

            if(i >= this.prevLength) {
                this.node.parentNode.insertBefore(this.rows[i].element, this.node);
                this.rows[i].notifyInsert();
            }

            this.rows[i].refresh({
                parent: context,
                item: newValue[i],
                index: i,
                itemBinder: this.rows[i],
                repeatBinder: this
            });
        }

        for(let i = newValue.length; i < this.prevLength; i++)
            this.rows[i].element.remove();

        this.prevLength = newValue.length;
    }
}

class boundElement {
    constructor(element, owner, binders) {
        ooElementTree.push([]);

        this.element = element;
        this.owner = owner;
        this.binders = new Array(binders.length);

        for(let i = 0; i < binders.length; i++)
            this.binders[i] = binders[i].build(element, owner);
    }

    notifyInsert() {
        if(!this.ooElements)
            this.ooElements = ooElementTree.pop();
    }

    refresh(context) {
        context = context || {};

        for(let i = 0; i < this.binders.length; i++)
            this.binders[i].process(this.owner, context);

        for(let i = 0; i < this.ooElements.length; i++)
            this.ooElements[i].refresh();
    }
}

export class ooElement extends HTMLElement {
    constructor(templateString) {
        super();

        initFactory(this.localName, templateString);

        if(ooElementTree.length != 0)
            ooElementTree[ooElementTree.length - 1].push(this);

        this.boundRoot = factories[this.localName].build(this);

        this.attachShadow({mode: 'open'}).appendChild(this.boundRoot.element);
        this.boundRoot.notifyInsert();
    }

    refresh() {
        this.boundRoot.refresh();
    }
}

function initFactory(tagName, templateString) {
    if(!factories[tagName]) {
        const template = document.createElement('template');
        template.innerHTML = templateString;

        factories[tagName] = new boundElementFactory(template.content);
    }
}