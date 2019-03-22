const ooTemplates = {};
const whatToShow = NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_COMMENT;

function makeValueFunction(evalString, fieldName) {
    return new Function(fieldName || 'item', 'index', 'return (' + evalString + ');');
}

class ooTemplate {
    constructor(rootNode, fieldName) {
        this.binders = [];
        this.nodeCounts = [];
        this.nodeTreeDepth = -1;
        this.rootNode = rootNode;
        this.fieldName = fieldName;
        this.bindNodes(rootNode);
    }

    makeNodeFunction(node) {
        if(node.nodeFunction)
            return node.nodeFunction;

        for(var accStr = 'return rootNode', i = 0; i <= this.nodeTreeDepth; i++)
            accStr += ('.childNodes[' + this.nodeCounts[i] + ']');

        return node.nodeFunction = new Function('rootNode', accStr + ';');
    }

    bindNodes(currentNode) {
        let children = [];
        let nodeStack = [currentNode];
        let walker = document.createTreeWalker(
            currentNode,
            whatToShow,
            {
                acceptNode: (node) => {
                    if(node.parentNode === nodeStack[this.nodeTreeDepth + 1])
                        this.nodeCounts[++this.nodeTreeDepth] = -1;
                    else while(nodeStack[this.nodeTreeDepth] !== node.parentNode)
                        this.nodeTreeDepth--;

                    nodeStack[this.nodeTreeDepth + 1] = node;
                    this.nodeCounts[this.nodeTreeDepth]++;

                    if(node.nodeType === 3 || (node.nodeType === 1 && node.localName !== 'style' && node.localName != 'script'))
                        return NodeFilter.FILTER_ACCEPT;

                    return NodeFilter.FILTER_REJECT;
                }
            },
            false);

        do {
            switch(currentNode.nodeType) {
                case 3:
                    this.bindTextNode(currentNode);
                    continue;
                case 1:
                    var factory =
                        currentNode.hasAttribute('oo-if') ? ifBinderFactory :
                        currentNode.hasAttribute('oo-for') ? forBinderFactory : null;

                    if(factory) {
                        children.push(new factory(currentNode, this.makeNodeFunction({}), this.fieldName));
                        walker.currentNode = children[children.length -1].placeholder;
                        continue;
                    }

                    this.bindElement(currentNode);
                    continue;
            }
        } while ((currentNode = walker.nextNode()) !== null);

        this.binders = [ ...children, ...this.binders];
    }

    bindTextNode(node) {
        let start, end;
        while((start = node.nodeValue.indexOf('{{')) !== -1 && (end = node.nodeValue.indexOf('}}', start)) !== -1) {
            let lastOffset = node.nodeValue.length - (end + 2);
            let matchNode = start > 0 ? this.splitTextNode(node, start) : node;

            this.binders.push(new textBinderFactory(this.makeNodeFunction(node), matchNode.nodeValue.substring(2, end - start), this.fieldName));

            node = lastOffset > 0 ? this.splitTextNode(matchNode, matchNode.nodeValue.length - lastOffset) : matchNode;
            matchNode.nodeValue = '\u200B';
        }
    }

    splitTextNode(node, offset) {
        this.nodeCounts[this.nodeTreeDepth]++;
        return node.splitText(offset);
    }

    bindElement(element) {
        // loop in reverse, so we can remove attributes while still looping
        for(let i = element.attributes.length - 1; i >= 0; i--) {
            let attrValue = element.attributes[i].value;

            if(attrValue[0] !== '{' || attrValue[attrValue.length - 1] !== '}')
                continue;

            let factory = element.attributes[i].name[0] === '.' ? propertyBinderFactory : attributeBinderFactory;

            this.binders.push(new factory(element, element.attributes[i], this.makeNodeFunction(element), this.fieldName));
        }

        if((customElements.get(element.localName) || Object).prototype instanceof ooElement)
            this.binders.push(new ooElementBinderFactory(this.makeNodeFunction(element)));
    }

    createInstance(thisArg) {
        return new ooTemplateInstance(this.rootNode.cloneNode(true), thisArg, this.binders);
    }
}

class ooElementBinderFactory {
    constructor(nodeEval) {
        this.build = nodeEval;
    }
}

class textBinderFactory{
    constructor(nodeFunction, valueEvalString, fieldName) {
        this.nodeFunction = nodeFunction;
        this.valueFunction = makeValueFunction(valueEvalString, fieldName);
    }

    build(rootNode, thisArg) {
        return new textBinder(this.nodeFunction(rootNode), this.valueFunction.bind(thisArg));
    }
}

class propertyBinderFactory {
    constructor(element, attribute, nodeFunction, fieldName) {
        this.propertyName = attribute.name.substring(1, attribute.name.length);
        this.valueFunction = makeValueFunction(attribute.value.substring(1, attribute.value.length - 1), fieldName);
        this.nodeFunction = nodeFunction;
    }

    build(rootNode, thisArg) {
        return new propertyBinder(this.nodeFunction(rootNode), this.valueFunction.bind(thisArg), this.propertyName);
    }
}

class attributeBinderFactory {
    constructor(element, attribute, nodeFunction, fieldName) {
        this.attributeName = attribute.name;
        this.valueFunction = makeValueFunction(attribute.value.substring(1, attribute.value.length - 1), fieldName);
        this.nodeFunction = nodeFunction;
    }

    build(rootNode, thisArg) {
        return new attributeBinder(this.nodeFunction(rootNode), this.valueFunction.bind(thisArg), this.attributeName);
    }
}

function createPlaceholder(element, attributeName) {
    let placeholder = document.createComment(attributeName);
    element.parentNode.insertBefore(placeholder, element.nextSibling);
    element.remove();
    element.removeAttribute(attributeName);

    return placeholder;
}

class ifBinderFactory {
    constructor(element, nodeFunction, fieldName) {
        this.nodeFunction = nodeFunction;
        this.valueFunction = makeValueFunction(element.getAttribute('oo-if'), fieldName);
        this.placeholder = createPlaceholder(element, 'oo-if');
        this.template = new ooTemplate(element, fieldName);
    }

    build(rootNode, thisArg) {
        return new ifBinder(this.nodeFunction(rootNode), this.valueFunction.bind(thisArg), this.template, thisArg);
    }
}

class forBinderFactory {
    constructor(element, nodeFunction, fieldName) {
        let valueEvalInfo = element.getAttribute('oo-for').split(' in ', 2);
        this.nodeFunction = nodeFunction;
        this.valueFunction = makeValueFunction(valueEvalInfo.length === 2 ? valueEvalInfo[1] : valueEvalInfo[0], fieldName);
        this.placeholder = createPlaceholder(element, 'oo-for');
        this.template = new ooTemplate(element, valueEvalInfo.length === 2 ? valueEvalInfo[0] : 'item');
    }

    build(rootNode, thisArg) {
        return new forBinder(this.nodeFunction(rootNode), this.valueFunction.bind(thisArg), this.template, thisArg);
    }
}

class binder {
    constructor(node, valueFunction, defaultValue) {
        this.node = node;
        this.valueFunction = valueFunction;
        this.defaultValue = defaultValue;
    }

    hasChanged(newValue) { return newValue !== this.oldValue; }

    refresh(item, index) {
        let newValue = this.valueFunction(item, index);

        if(newValue == null)
            newValue = this.defaultValue;

        if(this.hasChanged(newValue, item, index))
            this.update(newValue);

        this.oldValue = newValue;
    }
}

class propertyBinder extends binder {
    constructor(element, valueFunction, propertyName) {
        super(element, valueFunction, null);
        this.propertyName = propertyName;
    }

    update(newValue) {
        this.node[this.propertyName] = newValue;
    }
}

class attributeBinder extends binder {
    constructor(element, valueFunction, attributeName) {
        super(element, valueFunction, null);
        this.attributeName = attributeName;
    }

    update(newValue) {
        if(newValue == null)
            this.node.removeAttribute(this.attributeName);
        else
            this.node.setAttribute(this.attributeName, newValue);
    }
}

class textBinder extends binder {
    constructor(textNode, valueFunction) {
        super(textNode, valueFunction, '\u200B');
    }

    update(newValue) {
        this.node.nodeValue = newValue;
    }
}

class ifBinder extends binder {
    constructor(element, valueFunction, template, thisArg) {
        super(element, valueFunction, false);
        this.templateInstance = template.createInstance(thisArg);
    }

    hasChanged(newValue, item, index) {
        if(newValue)
            this.templateInstance.refresh(item, index);

        return newValue !== this.oldValue;
    }

    update(newValue) {
        if(newValue)
            this.node.parentNode.insertBefore(this.templateInstance.element, this.node);
        else
            this.data.element.remove();
    }
}

class forBinder extends binder {
    constructor(element, valueFunction, template, thisArg) {
        super(element, valueFunction, []);
        this.rows = [];
        this.previousLength = 0;
        this.parent = parent;
        this.template = template;
        this.thisArg = thisArg;
    }

    refresh(item, index) {
        this.newValue = this.valueFunction(item, index);

        for(let i = 0; i < this.newValue.length; i++) {
            if(!this.rows[i])
                this.rows[i] = this.template.createInstance(this.thisArg);

            if(i >= this.previousLength)
                this.node.parentNode.insertBefore(this.rows[i].element, this.node);

            this.rows[i].refresh(this.newValue[i], i);
        }

        for(let i = this.newValue.length; i < this.prevLength; i++)
            this.rows[i].element.remove();

        this.previousLength = this.newValue.length;
    }
}

class ooTemplateInstance {
    constructor(element, thisArg, binders) {
        this.element = element;
        this.thisArg = thisArg;
        this.binders = new Array(binders.length);

        for(let i = 0; i < binders.length; i++)
            this.binders[i] = binders[i].build(element, thisArg);
    }

    refresh(item, index) {
        for(let i = 0; i < this.binders.length; i++)
            this.binders[i].refresh(item, index);
    }
}

export class ooElement extends HTMLElement {
    constructor(templateString) {
        super();
        this.templateInstance = getTemplate(this.localName, templateString).createInstance(this);
        this.attachShadow({mode: 'open'}).appendChild(this.templateInstance.element);
        this.context = {};
    }

    refresh() {
        this.templateInstance.refresh();
    }
}

function getTemplate(tagName, templateString) {
    if(!ooTemplates[tagName]) {
        const template = document.createElement('template');
        template.innerHTML = templateString || '';
        ooTemplates[tagName] = new ooTemplate(template.content);
    }

    return ooTemplates[tagName];
}