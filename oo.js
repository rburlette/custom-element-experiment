const oo = {
    elements: {},
    define: function(tagName, elementClass, template) {
        if(window.ShadyCSS) 
            ShadyCSS.prepareTemplate(template, tagName);
        
        this.elements[tagName.toUpperCase()] = [];
        customElements.define(tagName, elementClass);
    },
    textNodeRegEx: /{{\s*([^}]+)\s*}}/g,
    emptyArray: []
};

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
        catch(err) {}
        
        if(this.hasChanged(newValue)) {
            this.update(newValue, context);
            this.oldValue = newValue;          
        }
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

class attributeBinder extends binder {
    constructor(element, attributeName, evalFunc) {
        super(element, evalFunc, null);
        this.attributeName = attributeName;
    }

    update(newValue, context) {
        if(newValue === null)
            this.node.removeAttribute(this.attributeName);
        else
            this.node.setAttribute(this.attributeName, newValue);
    }
}

class textNodeBinder extends binder {
    constructor(textNode, evalFunc) {
        super(textNode, evalFunc, '\u200B');
        textNode.nodeValue = '\u200B';
    }

    update(newValue, context) {
        this.node.nodeValue = newValue === null ? '\u200B' : newValue;
    }
}

class showBinder extends binder {
    constructor(element, evalFunc, owner, funcStore) {
        super(element, evalFunc, false);
        this.owner = owner;
        this.funcStore = funcStore || [];
    }

    hasChanged(newValue) { return true; }

    initialize() {
        this.parentNode = this.node.parentNode;
        this.nextSibling = document.createComment("show");
        this.parentNode.insertBefore(this.nextSibling, this.node.nextElementSibling);
        this.node.remove();
        this.boundElement = new boundElement(this.node, this.owner, this.funcStore);
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

class repeatBinder extends binder {
    constructor(element, evalFunc, owner, funcStore) {
        super(element, evalFunc, oo.emptyArray);
        this.owner = owner;
        this.funcStore = funcStore || [];
    }

    initialize() {
        this.parentNode = this.node.parentNode;        
        this.nextSibling = document.createComment("repeater");
        this.parentNode.insertBefore(this.nextSibling, this.node.nextElementSibling);
        this.node.remove();
        this.prevLength = 0,
        this.rows = [];
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
                this.nextSibling.parentNode.insertBefore(currentRow.element, this.nextSibling);
            }
        }

        if(newLength < this.prevLength) {
            for(let i = newLength; i < this.prevLength; i++) {
                try { this.rows[i].element.remove(); }
                catch(error){ console.log(error); }
            }
        }

        this.prevLength = newLength;
    }
}

class ooElementBinder extends binder {
    constructor(element) {
        super(element);
    }

    process() { if(this.node.refresh) this.node.refresh(); }
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

        if(element.attributes)
            this.bindAttributes(element);

        this.bindNodes();
    }

    makeFuncFromString(evalStr, makeChild) {
        if(this.funcStore[this.funcNum]) {
            return this.funcStore[this.funcNum++].func;
        }
        oo.numFuncsCreated++;
        this.funcStore[this.funcNum] = {
            func: new Function('item', 'context', 'return (' + evalStr + ');'),
            childFuncStore: makeChild ? [] : null
        };

        return this.funcStore[this.funcNum++].func;
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
                    
                    if(oo.elements[currentNode.tagName])
                        this.binders.push(new ooElementBinder(currentNode));
                    
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
                            let attr = node.dataset.rpt;

                            if(attr) {
                                _this.children.push(new repeatBinder(node, _this.makeFuncFromString(attr, true), _this.owner, _this.funcStore[_this.funcNum - 1].childFuncStore));
                                return NodeFilter.FILTER_REJECT;
                            }

                            attr = node.dataset.show;
                            
                            if(attr) {
                                _this.children.push(new showBinder(node, _this.makeFuncFromString(attr, true), _this.owner, _this.funcStore[_this.funcNum - 1].childFuncStore));
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
        let match, matchNode;

        while(match = oo.textNodeRegEx.exec(node.nodeValue)) {
            matchNode = node;
            if(oo.textNodeRegEx.lastIndex < node.nodeValue.length)
                node = node.splitText(oo.textNodeRegEx.lastIndex);
            
            if(match.index > 0)
                matchNode = matchNode.splitText(match.index);
            
            this.binders.push(
                new textNodeBinder(
                    matchNode, 
                    this.makeFuncFromString(match[1])
                )
            );
        }
    }

    bindAttributes(element) {
        for(let i = element.attributes.length - 1; i >= 0; i--) {
            let attrName = element.attributes[i].name;
            let thisBinder = undefined;

            if(this.surroundedBy(attrName, '[]')) {
                thisBinder = propertyBinder;        
            }
            else if(this.surroundedBy(attrName, '{}')) {
                thisBinder = attributeBinder;
            }

            if(thisBinder) {
                this.binders.push(
                    new thisBinder(
                        element, 
                        attrName.substring(1, attrName.length - 1), 
                        this.makeFuncFromString(element.attributes[i].value)
                    )
                ); 
                element.removeAttribute(attrName);   
            }
        }
    }

    surroundedBy(inputStr, chars) {
        return inputStr[0] === chars[0] && inputStr[inputStr.length - 1] === chars[1]
    }

    refresh(context) {
        for(let i = 0, len = this.binders.length; i < len; i++) {
            this.binders[i].process(this.owner, context || { });
        }
    }
}