const textNodeRegEx = /{{\s*([^}]+)\s*}}/g;
const emptyArray = [];

const stats = {
    numFunctionsCreated: 0,
    numFunctionCalls: 0,
    numUpdates: 0,
};

class binder {
    constructor(node, evalFunc, defaultValue) {
        this.node = node;
        this.evalFunc = evalFunc;
        this.defaultValue = defaultValue;
    }

    hasChanged(newValue) { return newValue !== this.oldValue; }

    process(thisArg, context) {
        let newValue = this.defaultValue;
        stats.numFunctionCalls++;
        try { newValue = this.evalFunc.call(thisArg, context ? context.item : undefined, context); }
        catch(err) {}
        
        if(this.hasChanged(newValue)) {
            this.update(newValue, context);
            this.oldValue = newValue;
            stats.numUpdates++;                
        }
    }

    update(newValue, context) {}
}

class attributeBinder extends binder {
    constructor(element, attributeName, evalFunc) {
        super(element, evalFunc, null);
        this.attributeName = attributeName;
    }

    update(newValue, context) {
        super.update(newValue, context);

        if(newValue === null)
            this.node.removeAttribute(this.attributeName);
        else
            this.node.setAttribute(this.attributeName, newValue);
    }
}

class textNodeBinder extends binder {
    constructor(textNode, evalFunc) {
        super(textNode, evalFunc, '');
        textNode.nodeValue = '';
    }

    update(newValue, context) {
        this.node.nodeValue = newValue;
    }
}

class propertyBinder extends binder {
    constructor(element, propertyName, evalFunc) {
        super(element, evalFunc, null);
        this.propertyName = propertyName;
    }

    update(newValue, context) {
        this.node[this.propertyName] = newValue;
    }
}

class showBinder extends binder {
    constructor(element, evalFunc, owner) {
        super(element, evalFunc, false);
        this.owner = owner;
        this.oldValue = false;
    }

    hasChanged(newValue) { return true; }

    initialize() {
        this.parentNode = this.node.parentNode;
        this.nextSibling = document.createComment("show");
        this.parentNode.insertBefore(this.nextSibling, this.node.nextSibling);
        this.node.remove();
        this.boundElement = new boundElement(this.node, this.owner);
    }
    
    update(newValue, context) {
        if(newValue) this.boundElement.refresh(context);

        if(newValue === this.oldValue) return;

        if(newValue)
            this.parentNode.insertBefore(this.node, this.nextSibling);
        else 
            this.node.remove();
    }
}

class boundElement {
    constructor(element, owner, funcStore) {
        this.children = [];
        this.binders = [];
        this.matches = [];
        this.element = element;
        this.owner = owner;
        this.funcNum = 0;
        this.funcStore = funcStore || [];
        this.ooElements = [];
        
        if(element.attributes)
            this.bindAttributes(element);

        this.bindNodes();
    }

    makeFuncFromString(evalStr) {
        if(this.funcStore[this.funcNum]) {
            return this.funcStore[this.funcNum++];
        }
        
        stats.numFunctionsCreated++;
        
        return this.funcStore[this.funcNum++] = new Function('item', 'context', 'return (' + evalStr + ');');
    }

    bindNodes() {
        let walker = this.buildTreeWalker(this.element);
        let currentNode;

        while(currentNode = walker.nextNode()){
            switch(currentNode.nodeType) {
                case 3:
                    this.bindTextNodes(currentNode);
                    break;
                case 1:
                    this.bindAttributes(currentNode);
                    break;
            }
        }

        this.binders = this.children.concat(this.binders);

        for(let i = 0, len = this.children.length; i < len; i++) {
            this.children[i].initialize();
        }
    }

    buildTreeWalker(element) {
        let _this = this;

        function acceptNode(node) {
            switch(node.nodeType) {
                case 3:
                    if(node.nodeValue.length < 5)
                        return NodeFilter.FILTER_REJECT;
                    
                    return NodeFilter.FILTER_ACCEPT;
                case 1:
                    switch(node.nodeName) {
                        case 'STYLE':
                        case 'SCRIPT':
                            return NodeFilter.FILTER_REJECT;
                        default:
                            if(node instanceof ooElement) {
                                _this.ooElements.push(node);
                            }
                        
                            let attr = node.dataset.rpt;

                            if(attr) {
                                _this.children.push(new repeatBinder(node, _this.makeFuncFromString(attr), _this.owner));
                                return NodeFilter.FILTER_REJECT;
                            }

                            attr = node.dataset.show;
                            
                            if(attr) {
                                _this.children.push(new showBinder(node, _this.makeFuncFromString(attr), _this.owner));
                                return NodeFilter.FILTER_REJECT;
                            }
                            
                            return NodeFilter.FILTER_ACCEPT;
                    }  
            }
        }
        
        // Work around Internet Explorer wanting a function instead of an object.
        // IE also *requires* this argument where other browsers don't.
        const safeFilter = acceptNode;
        safeFilter.acceptNode = acceptNode;
        
        return document.createTreeWalker(
            element,
            NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT,
            safeFilter,
            false);
    }

    bindTextNodes(node) {
        let match;
        let matchNum = 0;

        while(match = textNodeRegEx.exec(node.nodeValue)) {
            this.matches[matchNum++] = {
                evalText: match[1],
                startIndex: match.index,
                endIndex: textNodeRegEx.lastIndex
            };
        }
        
        if(matchNum === 0)
            return;

        // go backward, so as not to lose the reference for our original node
        for(let i = matchNum - 1, thisMatch; i >= 0; i--)
        {
            thisMatch = this.matches[i];
            
            // if the end of our match is not the end of the text node, cut off the end
            if(node.nodeValue.length > thisMatch.endIndex)
                node.splitText(thisMatch.endIndex);
            
            // if we are not at the beginning of the text node, split it, so our bound text node
            // starts right at the binding point
            this.binders.push(
                new textNodeBinder(
                    thisMatch.startIndex != 0 ? node.splitText(thisMatch.startIndex) : node, 
                    this.makeFuncFromString(thisMatch.evalText)
                )
            );
        }
    }

    bindAttributes(element) {
        let attr;
        let attrName;
        let realName;
        let currentBinder;

        for(let i = element.attributes.length - 1; i >= 0; i--) {
            attr = element.attributes[i];
            attrName = attr.name;

            if(attrName[0] === '[' && attrName[attrName.length - 1] === ']') {
                
                realName = attrName.substring(1, attrName.length - 1);
                
                currentBinder = realName in element ? propertyBinder : attributeBinder;
                
                this.binders.push(
                    new currentBinder(
                        element, 
                        realName, 
                        this.makeFuncFromString(attr.value)
                    )
                );

                element.removeAttribute(attrName);
            }
        }
    }

    refresh(context) {
        context = context || {};
        context.binder = this;

        for(let i = 0, len = this.binders.length; i < len; i++) {
            this.binders[i].process(this.owner, context || { binder: this });
        }
    }

    getStats() {
        return stats;
    }

    resetStats() {
        stats.numFunctionsCreated = 0;
        stats.numFunctionCalls = 0;
        stats.numUpdates = 0;
    }
}

class repeatBinder extends binder {
    constructor(element, evalFunc, owner) {
        super(element, evalFunc, emptyArray);
        this.owner = owner;
    }

    initialize() {
        this.parentNode = this.node.parentNode;        
        this.nextSibling = document.createComment("repeater");
        this.parentNode.insertBefore(this.nextSibling, this.node.nextSibling);
        this.node.remove();
        this.prevLength = 0,
        this.rows = [];
        this.funcStore = [];
    }

    hasChanged(newValue) { return true; }

    update(newValue, context) {
        let newLength = newValue.length;
        let rowsLength = this.rows.length;

        for(let i = 0, currentRow; i < newLength; i++) {
            if(i >= rowsLength)
                this.rows[i] = new boundElement(this.node.cloneNode(true), this.owner, this.funcStore);

            currentRow = this.rows[i];

            currentRow.refresh({
                parent: context,
                item: newValue[i],
                index: i,
                binder: currentRow
            });

            if(i >= this.prevLength) {
                this.parentNode.insertBefore(currentRow.element, this.nextSibling);
            }
        }

        if(newLength < this.prevLength) {
            for(let i = newLength; i < this.prevLength; i++) {
                this.rows[i].element.remove();
            }
        }

        this.prevLength = newLength;
    }
}