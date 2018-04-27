const oo = {
    elements: {},
    define: function(tagName, elementClass, template) {
        if(window.ShadyCSS) 
            ShadyCSS.prepareTemplate(template, tagName);
        
        this.elements[tagName.toUpperCase()] = [];
        customElements.define(tagName, elementClass);
    },
    pattern: /{{\s*([^}]+)\s*}}/g,
    empty: [],
    emptyStr: '\u200B',
    filter: {
        acceptNode: function(node) {
            if(node.nodeType === 3)
                return node.nodeValue.length < 5 ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT;
        
            if(node.nodeName === 'STYLE' || node.NodeName === 'SCRIPT')
                return NodeFilter.FILTER_REJECT;
            
            return NodeFilter.FILTER_ACCEPT;
        }
    }
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
        
        if(this.hasChanged(newValue))
            this.update(newValue, context);
        
        this.oldValue = newValue;          
    }
}

class propBinder extends binder {
    constructor(element, propName, evalFunc) {
        super(element, evalFunc, null);
        this.propName = propName;
    }

    update(newValue, context) {
        this.node[this.propName] = newValue;
    }
}

class attrBinder extends binder {
    constructor(element, attrName, evalFunc) {
        super(element, evalFunc, null);
        this.attrName = attrName;
    }

    update(newValue, context) {
        if(newValue === null)
            this.node.removeAttribute(this.attrName);
        else
            this.node.setAttribute(this.attrName, newValue);
    }
}

class textBinder extends binder {
    constructor(textNode, evalFunc) {
        super(textNode, evalFunc, oo.emptyStr);
        textNode.nodeValue = oo.emptyStr;
    }

    update(newValue, context) {
        this.node.nodeValue = newValue === null ? oo.emptyStr : newValue;
    }
}

class childBinder extends binder {
    constructor(type, element, funcCache, owner, defaultValue) {
        super(element, funcCache.func, false);
        this.owner = owner;
        this.funcStore = funcCache.childFuncStore || [];
        this.parentNode = this.node.parentNode;
        this.nextSibling = document.createComment(type);
        this.node.removeAttribute(type);
    }

    init() {
        this.parentNode.insertBefore(this.nextSibling, this.node.nextSibling);
        this.node.remove();
    }

    hasChanged() { return true; }
}

class showBinder extends childBinder {
    constructor(element, funcCache, owner) {
        super('data-show', element, funcCache, owner, false);
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

class repeatBinder extends childBinder {
    constructor(element, funcCache, owner) {
        super('data-rpt', element, funcCache, owner, oo.empty);
        this.prevLength = 0,
        this.rows = [];
    }

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
                itemBinder: currentRow,
                repeatBinder: this
            });

            if(i >= this.prevLength)
                this.nextSibling.parentNode.insertBefore(currentRow.element, this.nextSibling);
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
        this.element = element;
        this.owner = owner;
        this.funcNum = 0;
        this.funcStore = funcStore || [];

        this.bindNodes(element);
    }

    makeFuncFromString(evalStr, makeChild) {
        if(this.funcStore[this.funcNum])
            return this.funcStore[this.funcNum++];

        return this.funcStore[this.funcNum++] = {
            func: new Function('item', 'context', 'return (' + evalStr + ');'),
            childFuncStore: makeChild ? [] : null
        };
    }

    bindNodes(node) {
        let walker = document.createTreeWalker(
            node, 
            NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT, 
            oo.filter, 
            false);

        do {
            switch(node.nodeType) {
                case 3:
                    this.bindTextNodes(node);
                    continue;
                case 1:
                    let childBinder = (node.dataset.show ? new showBinder(node, this.makeFuncFromString(node.dataset.show, true), this.owner) : 
                                      (node.dataset.rpt ? new repeatBinder(node, this.makeFuncFromString(node.dataset.rpt, true), this.owner) : null))

                    if(childBinder) {
                        this.children.push(childBinder);
                        node = walker.lastChild() || node;
                        continue;
                    }

                    if(node.attributes.length > 0)
                        this.bindAttributes(node);
                        
                    if(oo.elements[node.tagName])
                        this.binders.push(new ooElementBinder(node));
            }
        } while(node = walker.nextNode());

        for(let i = 0; i < this.children.length; i++)
            this.children[i].init();

        this.binders = this.children.concat(this.binders);
    }

    bindTextNodes(node) {
        let match, matchNode;

        while(match = oo.pattern.exec(node.nodeValue)) {
            matchNode = node;
            if(oo.pattern.lastIndex < node.nodeValue.length)
                node = node.splitText(oo.pattern.lastIndex);
            
            if(match.index > 0)
                matchNode = matchNode.splitText(match.index);
            
            this.binders.push(
                new textBinder(
                    matchNode, 
                    this.makeFuncFromString(match[1]).func
                )
            );
        }
    }

    bindAttributes(element) {
        let attrName, thisBinder;
        
        for(let i = element.attributes.length - 1; i >= 0; i--) {
            attrName = element.attributes[i].name;

            thisBinder = (attrName[0] === '[' && attrName[attrName.length - 1] === ']' ? propBinder : 
                         (attrName[0] === '{' && attrName[attrName.length - 1] === '}' ? attrBinder : null));

            if(thisBinder) {
                this.binders.push(
                    new thisBinder(
                        element, 
                        attrName.substring(1, attrName.length - 1), 
                        this.makeFuncFromString(element.attributes[i].value).func
                    )
                ); 
                element.removeAttribute(attrName);   
            }
        }
    }

    refresh(context) {
        for(let i = 0, len = this.binders.length; i < len; i++)
            this.binders[i].process(this.owner, context || { });
    }
}