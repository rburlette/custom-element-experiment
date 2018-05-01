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
        if(tw.parentNode() === null) return null;
            
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
                        _this.nodeCounts[_this.level] = 0
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

        do {
            switch(currentNode.nodeType) {
                case 3:
                    this.bindTextNodes(currentNode);
                    break;
                case 1:
                    let childBinder = (currentNode.dataset.show ? new showBinderFactory(currentNode, this.makeFuncFromString(currentNode.dataset.show, true), this.makeAcc()) : 
                                      (currentNode.dataset.rpt ? new repeatBinderFactory(currentNode, this.makeFuncFromString(currentNode.dataset.rpt, true), this.makeAcc()) : null))

                    if(childBinder) {
                        this.children.push(childBinder);
                        currentNode = walker.nextSibling() || this.getParentNextSibling(walker);
                        continue;
                    }

                    if(currentNode.attributes.length > 0)
                        this.bindAttributes(currentNode);
                        
                    if(oo.elements[currentNode.tagName])
                        this.binders.push(new ooElementBinderFactory(this.makeAcc()));
            }
            currentNode = walker.nextNode()
        } while(currentNode);

        for(let i = 0; i < this.children.length; i++)
            this.children[i].init();

        this.binders = this.children.concat(this.binders);
    }

    bindTextNodes(node) {
        let match, matchNode, isEnd;

        while(match = oo.pattern.exec(node.nodeValue)) {
            matchNode = node;
            isEnd = false;
            if(oo.pattern.lastIndex < node.nodeValue.length) {
                node = node.splitText(oo.pattern.lastIndex);
                isEnd = true;
            }
                        
            if(match.index > 0) {
                matchNode = matchNode.splitText(match.index);
                this.nodeCounts[this.level]++;
            }
            
            matchNode.nodeValue = oo.emptyStr;
            this.binders.push(
                new textBinderFactory(
                    matchNode,
                    this.makeFuncFromString(match[1]),
                    this.makeAcc()
                )
            );

            if(isEnd)
                this.nodeCounts[this.level]++;
        }
    }

    bindAttributes(element) {
        let attrName, thisBinder;
        
        for(let i = element.attributes.length - 1; i >= 0; i--) {
            attrName = element.attributes[i].name;

            thisBinder = (attrName[0] === '[' && attrName[attrName.length - 1] === ']' ? propBinderFactory : 
                         (attrName[0] === '{' && attrName[attrName.length - 1] === '}' ? attrBinderFactory : null));

            if(thisBinder) {
                this.binders.push(
                    new thisBinder(
                        attrName.substring(1, attrName.length - 1), 
                        this.makeFuncFromString(element.attributes[i].value),
                        this.makeAcc()
                    )
                ); 
                element.removeAttribute(attrName);   
            }
        }
    }

    build(owner) {
        let newBe = new boundElement(this.template.cloneNode(true), owner);

        for(let i = 0, len = this.binders.length; i < len; i++)
            newBe.binders.push(this.binders[i].build(newBe.element, owner));

        return newBe;
    }
}

class binderFactory {
    constructor(evalFunc, acc) {
        this.evalFunc = evalFunc;
        this.acc = acc;
    }
}

class propBinderFactory extends binderFactory {
    constructor(propName, evalFunc, acc) {
        super(evalFunc, acc);
        this.propName = propName;
    }

    build(root, owner) {
        return new propBinder(this.acc(root), this.propName, this.evalFunc);
    }
}

class attrBinderFactory extends binderFactory {
    constructor(attrName, evalFunc, acc) {
        super(evalFunc, acc);
        this.attrName = attrName;
    }

    build(root, owner) {
        return new attrBinder(this.acc(root), this.attrName, this.evalFunc);
    }
}

class textBinderFactory extends binderFactory {
    constructor(textNode, evalFunc, acc) {
        super(evalFunc, acc);
        textNode.nodeValue = oo.emptyStr;
    }

    build(root, owner) {
        return new textBinder(this.acc(root), this.evalFunc);
    }
}

class childBinderFactory extends binderFactory {
    constructor(type, element, evalFunc, acc) {
        super(evalFunc, acc);
        this.element = element;
        this.parentNode = element.parentNode;
        this.nextSibling = document.createComment(type);
        element.removeAttribute(type);
    }

    init() {
        this.parentNode.insertBefore(this.nextSibling, this.element.nextSibling);
        this.element.remove();
        this.binderFactory = new boundElementFactory(this.element);
    }
}

class showBinderFactory extends childBinderFactory {
    constructor(element, evalFunc, acc) {
        super('data-show', element, evalFunc, acc);
    }

    build(root, owner) {
        return new showBinder(this.acc(root), this.evalFunc, this.binderFactory, owner);
    }
}

class repeatBinderFactory extends childBinderFactory {
    constructor(element, evalFunc, acc) {
        super('data-rpt', element, evalFunc, acc);
    }

    build(root, owner) {
        return new repeatBinder(this.acc(root), this.evalFunc, this.binderFactory, owner);
    }
}

class ooElementBinderFactory extends binderFactory {
    constructor(acc) {
        super(null, acc);
    }

    build(root, owner) {
        return new ooElementBinder(this.acc(root));
    }
}