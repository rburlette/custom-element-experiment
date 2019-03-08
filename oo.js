const factories = {};

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

                            var childBinder =
                                node.hasAttribute('oo-if') ? new childBinderFactory(node, ifBinder, this.makeNodeFunc(), 'oo-if') :
                                node.hasAttribute('oo-for') ? new childBinderFactory(node, forBinder, this.makeNodeFunc(), 'oo-for') :
                                null;

                            if(childBinder) {
                                children.push(childBinder);
                                return NodeFilter.FILTER_REJECT;
                            }

                            return NodeFilter.FILTER_ACCEPT;

                        default:
                            return NodeFilter.FILTER_REJECT;
                    }
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

        for(let i = 0; i <children.length; i++)
            children[i].init();

        this.binders = [ ...children, ...this.binders];
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
        let nodeEval;

        // loop in reverse, so we can remove attributes while still looping
        for(let i = element.attributes.length - 1; i >= 0; i--) {
            let attrName = element.attributes[i].name;

            let binderType =
                (attrName[0] === '[' && attrName[attrName.length - 1] === ']' ? propBinder :
                (attrName[0] === '{' && attrName[attrName.length - 1] === '}' ? attrBinder :
                null));

            if(binderType) {
                this.binders.push(
                    new binderFactory(
                        binderType,
                        nodeEval = nodeEval || this.makeNodeFunc(),
                        element.attributes[i].value,
                        attrName.substring(1, attrName.length - 1)
                    )
                );

                element.removeAttribute(attrName);
            }
        }

        if(factories[element.localName] || (customElements.get(element.localName) || Object).prototype instanceof ooElement)
            this.binders.push(new ooElementFactory(nodeEval = nodeEval || this.makeNodeFunc()));
    }

    build(owner, parent, index) {
        return new boundElement(this.template.cloneNode(true), owner, this.binders, parent, index);
    }
}

class ooElementFactory {
    constructor(nodeEval) {
        this.nodeEval = nodeEval;
    }

    build(root) {
        return this.nodeEval(root);
    }
}

class binderFactory {
    constructor(binderType, nodeEval, valueEval, data, fieldName) {
        this.binderType = binderType;
        this.data = data;
        this.nodeEval = nodeEval;
        this.valueEval = new Function('parent', 'index', fieldName || 'item', 'return (' + valueEval + ');');
    }

    build(root, owner) {
        return new this.binderType(this.nodeEval(root), this.valueEval, this.data, owner);
    }
}

class childBinderFactory extends binderFactory {
    constructor(element, binderType, nodeEval, attr, fieldName) {
        super(binderType, nodeEval, element.getAttribute(attr), attr, fieldName);
        element.removeAttribute(attr);
        this.element = element;
    }

    init() {
        this.element.parentNode.insertBefore(document.createComment(this.data), this.element.nextSibling);
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

    refresh(thisArg, parent, index, item) {
        try { var newValue = this.evalFunc.call(thisArg, parent, index, item); }
        catch(err) { console.log('Evaluation Error: ' + this.evalFunc); }

        if(newValue == null)
            newValue = this.defaultValue;

        if(this.hasChanged(newValue))
            this.update(newValue, parent, index, item);

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
        if(newValue == null)
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

class ifBinder extends binder {
    constructor(element, evalFunc, factory, owner, parent) {
        super(element, evalFunc, false);
        this.boundElement = factory.build(owner, parent.parent, parent.index);
    }

    update(newValue) {
        if(newValue)
            this.boundElement.refresh();

        if(newValue === this.oldValue) return;

        if(newValue)
            this.node.parentNode.insertBefore(this.boundElement.element, this.node);
        else
            this.data.element.remove();
    }
}

class forBinder extends binder {
    constructor(element, evalFunc, factory, owner, parent) {
        super(element, evalFunc, []);
        this.rows = [];
        this.prevLength = 0;
        this.parent = parent;
        this.factory = factory;
        this.owner = owner;
    }

    hasChanged() { return true; }

    update(newValue) {
        for(let i = 0; i < newValue.length; i++) {
            if(!this.rows[i])
                this.rows[i] = this.factory.build(this.owner, this.parent, i);

            if(i >= this.prevLength)
                this.node.parentNode.insertBefore(this.rows[i].element, this.node);

            this.rows[i].refresh(newValue[i]);
        }

        for(let i = newValue.length; i < this.prevLength; i++)
            this.rows[i].element.remove();

        this.prevLength = newValue.length;
    }
}

class boundElement {
    constructor(element, owner, binders, parent, index) {
        this.element = element;
        this.owner = owner;
        this.binders = new Array(binders.length);
        this.parent = parent;
        this.index = index;

        for(let i = 0; i < binders.length; i++)
            this.binders[i] = binders[i].build(element, owner);
    }

    refresh(item) {
        for(let i = 0; i < this.binders.length; i++)
            this.binders[i].refresh(this.owner, this.parent, this.index, item);
    }
}

export class ooElement extends HTMLElement {
    constructor(templateString) {
        super();
        this.boundRoot = constructElement(this.localName, templateString).build(this);
        this.attachShadow({mode: 'open'}).appendChild(this.boundRoot.element);
    }

    refresh() {
        this.boundRoot.refresh();
    }
}

function constructElement(tagName, templateString) {
    if(!factories[tagName]) {
        const template = document.createElement('template');
        template.innerHTML = templateString || '';
        factories[tagName] = new boundElementFactory(template.content);
    }

    return factories[tagName];
}