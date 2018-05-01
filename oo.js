const oo = {
    elements: {},
    define: function(tagName, elementClass, template) {
        if(window.ShadyCSS) 
            ShadyCSS.prepareTemplate(template, tagName);
        
        this.elements[tagName.toUpperCase()] = new boundElementFactory(template.content);    
        customElements.define(tagName, elementClass);

    },
    pattern: /{{\s*([^}]+)\s*}}/g,
    empty: [],
    emptyStr: '\u200B'
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
    }

    update(newValue, context) {
        this.node.nodeValue = newValue === null ? oo.emptyStr : newValue;
    }
}

class childBinder extends binder {
    constructor(element, func, factory, owner, defaultValue) {
        super(element, func, false);
        this.factory = factory;
        this.owner = owner;
    }
    hasChanged() { return true; }
}

class showBinder extends childBinder {
    constructor(element, func, factory, owner) {
        super(element, func, factory, owner, false);
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
    constructor(element, func, factory, owner) {
        super(element, func, factory, owner, oo.empty);
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
                catch(error){ console.log(error); }
            }
        }

        this.prevLength = newLength;
    }
}

class ooElementBinder extends binder {
    constructor(element) {
        super(element, null, null);
    }

    process() { if(this.node.refresh) this.node.refresh(); }
}

class boundElement {
    constructor(element, owner) {
        this.owner = owner;
        this.binders = [];
        this.element = element;
    }

    refresh(context) {
        for(let i = 0, len = this.binders.length; i < len; i++)
            this.binders[i].process(this.owner, context || { });
    }
}