const freshTemplates = {};
const walkerNodeFilter = NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_COMMENT;
const emptyArray = [];
const zeroWidthString = '\u200B';

class freshTemplate {
	constructor(rootNode, fieldName) {
		this.factories = [];
		this.nodeCounts = new Array(100);
		this.walkerDepth = -1;
		this.rootNode = rootNode;
		this.fieldName = fieldName;
		this.createFactories(rootNode);
	}

	makeNodeFunction() {
		for(var nodeEvalString = 'return rootNode', i = 0; i <= this.walkerDepth; i++)
			nodeEvalString += ('.childNodes[' + this.nodeCounts[i].count + ']');

		return new Function('rootNode', nodeEvalString + ';');
	}

	createFactories(currentNode) {
		let previousNode = currentNode,
			childFactories = [];

		let walker = document.createTreeWalker(
			currentNode,
			walkerNodeFilter,
			(node) => {
				if(node.parentNode === previousNode)
					this.nodeCounts[++this.walkerDepth] = {parent: node.parentNode, count: -1};
				else while(this.nodeCounts[this.walkerDepth].parent !== node.parentNode)
					this.walkerDepth--;

				previousNode = node;
				this.nodeCounts[this.walkerDepth].count++;

				if(node.nodeType === 3 || (node.nodeType === 1 && node.localName !== 'style' && node.localName != 'script'))
					return NodeFilter.FILTER_ACCEPT;

				return NodeFilter.FILTER_REJECT;
			},
			false);

		do {
			switch(currentNode.nodeType) {
				case 3:
					this.bindTextNode(currentNode);
					continue;
				case 1:
					var factory =
						currentNode.hasAttribute('fjs-if') ? ifBinderFactory :
						currentNode.hasAttribute('fjs-for') ? forBinderFactory : null;

					if(factory) {
						childFactories.push(new factory(currentNode, this.makeNodeFunction(), this.fieldName));
						walker.currentNode = childFactories[childFactories.length - 1].placeholder;
						continue;
					}

					this.bindElement(currentNode);
					continue;
			}
		} while ((currentNode = walker.nextNode()) !== null);

		this.factories = [ ...childFactories, ...this.factories];
	}

	bindTextNode(node) {
		let start, end;
		while((start = node.nodeValue.indexOf('{{')) !== -1 && (end = node.nodeValue.indexOf('}}', start)) !== -1) {
			let lastOffset = node.nodeValue.length - (end + 2);
			let matchNode = start > 0 ? this.splitTextNode(node, start) : node;

			this.factories.push(new textBinderFactory(this.makeNodeFunction(), matchNode.nodeValue.substring(2, end - start), this.fieldName));

			node = lastOffset > 0 ? this.splitTextNode(matchNode, matchNode.nodeValue.length - lastOffset) : matchNode;
			matchNode.nodeValue = zeroWidthString;
		}
	}

	splitTextNode(node, offset) {
		this.nodeCounts[this.walkerDepth].count++;
		return node.splitText(offset);
	}

	bindElement(element) {
		// loop in reverse, so we can remove attributes while still looping
		for(let i = element.attributes.length - 1; i >= 0; i--) {
			let attrName = element.attributes[i].name;

			if(attrName[0] !== '[' || attrName[attrName.length - 1] !== ']')
				continue;

			let factoryClass = element.attributes[i].name[1] === '.' ? propertyBinderFactory : attributeBinderFactory;

			this.factories.push(new factoryClass(element.attributes[i], this.makeNodeFunction(), this.fieldName));
			element.removeAttribute(attrName);
		}

		if((customElements.get(element.localName) || Object).prototype instanceof freshElement)
			this.factories.push(new freshElementBinderFactory(this.makeNodeFunction()));
	}

	createInstance(thisArg) {
		return new freshTemplateInstance(this.rootNode.cloneNode(true), thisArg, this.factories);
	}
}

class freshElementBinderFactory {
	constructor(nodeFunction) {
		this.build = nodeFunction;
	}
}

class binderFactory {
	constructor(binderClass, nodeFunction, valueEvalString, fieldName, data) {
		this.binderClass = binderClass;
		this.nodeFunction = nodeFunction;
		this.valueFunction = new Function(fieldName || 'item', 'index', 'return (' + valueEvalString + ');');
		this.data = data;
	}

	build(rootNode, thisArg) {
		return new this.binderClass(this.nodeFunction(rootNode), this.valueFunction.bind(thisArg), thisArg, this.data);
	}
}

class textBinderFactory extends binderFactory {
	constructor(nodeFunction, valueEvalString, fieldName) {
		super(textBinder, nodeFunction, valueEvalString, fieldName);
	}
}

class propertyBinderFactory extends binderFactory {
	constructor(attribute, nodeFunction, fieldName) {
		super(propertyBinder, nodeFunction, attribute.value, fieldName, attribute.name.substring(2, attribute.name.length - 1));
	}
}

class attributeBinderFactory extends binderFactory {
	constructor(attribute, nodeFunction, fieldName) {
		super(attributeBinder, nodeFunction, attribute.value, fieldName, attribute.name.substring(1, attribute.name.length - 1));
	}
}

class childBinderFactory extends binderFactory {
	constructor(childBinderClass, element, nodeFunction, valueEvalString, fieldName, childFieldName, attributeName) {
		super(childBinderClass, nodeFunction, valueEvalString, fieldName);
		this.placeholder = element.parentNode.insertBefore(document.createComment(attributeName), element.nextSibling);
		element.remove();
		element.removeAttribute(attributeName);
		this.data = new freshTemplate(element, childFieldName);
	}
}

class ifBinderFactory extends childBinderFactory {
	constructor(element, nodeFunction, fieldName) {
		super(ifBinder, element, nodeFunction, element.getAttribute('fjs-if'), fieldName, fieldName, 'fjs-if');
	}
}

class forBinderFactory extends childBinderFactory {
	constructor(element, nodeFunction, fieldName) {
		let evalInfo = element.getAttribute('fjs-for').split(' in ', 2);
		super(forBinder, element, nodeFunction, evalInfo[evalInfo.length - 1], fieldName, evalInfo.length === 2 ? evalInfo[0] : 'item', 'fjs-for');
	}
}

class binder {
	constructor(node, valueFunction, defaultValue, thisArg, data) {
		this.node = node;
		this.valueFunction = valueFunction;
		this.defaultValue = defaultValue;
		this.thisArg = thisArg;
		this.data = data;
	}

	hasChanged(newValue) {
		return newValue !== this.oldValue;
	}

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
	constructor(element, valueFunction, thisArg, propertyName) {
		super(element, valueFunction, null, thisArg, propertyName);
		this.propertyName = propertyName;
	}

	hasChanged(newValue) {
		return typeof this.oldValue !== 'function' && this.oldValue !== newValue;
	}

	update(newValue) {
		this.node[this.propertyName] = newValue;
	}
}

class attributeBinder extends binder {
	constructor(element, valueFunction, thisArg, attributeName) {
		super(element, valueFunction, null, thisArg, attributeName);
	}

	update(newValue) {
		if(newValue == null)
			this.node.removeAttribute(this.data);
		else
			this.node.setAttribute(this.data, newValue);
	}
}

class textBinder extends binder {
	constructor(textNode, valueFunction, thisArg) {
		super(textNode, valueFunction, zeroWidthString, thisArg);
	}

	update(newValue) {
		this.node.nodeValue = newValue;
	}
}

class ifBinder extends binder {
	constructor(element, valueFunction, template, thisArg) {
		super(element, valueFunction, false, thisArg, template.createInstance(thisArg));
	}

	hasChanged(newValue, item, index) {
		if(newValue)
			this.data.refresh(item, index);

		return newValue !== this.oldValue;
	}

	update(newValue) {
		if(newValue)
			this.node.parentNode.insertBefore(this.data.element, this.node);
		else
			this.data.element.remove();
	}
}

class forBinder extends binder {
	constructor(element, valueFunction, thisArg, template) {
		super(element, valueFunction, emptyArray, thisArg, template);
		this.rows = [];
		this.previousLength = 0;
	}

	refresh(item, index) {
		let newValue = this.valueFunction(item, index);

		for(let i = 0; i < newValue.length; i++) {
			if(!this.rows[i])
				this.rows[i] = this.data.createInstance(this.thisArg);

			if(i >= this.previousLength)
				this.node.parentNode.insertBefore(this.rows[i].element, this.node);

			this.rows[i].refresh(newValue[i], i);
		}

		for(let i = newValue.length; i < this.prevLength; i++)
			this.rows[i].element.remove();

		this.previousLength = newValue.length;
	}
}

class freshTemplateInstance {
	constructor(element, thisArg, factories) {
		this.element = element;
		this.binders = new Array(factories.length);
		for(let i = 0; i < factories.length; i++)
			this.binders[i] = factories[i].build(element, thisArg);
	}

	refresh(item, index) {
		for(let i = 0; i < this.binders.length; i++)
			this.binders[i].refresh(item, index);
	}
}

export class freshElement extends HTMLElement {
	constructor(templateString) {
		super();

		if(!freshTemplates[this.localName]) {
			const template = document.createElement('template');
			template.innerHTML = templateString || '';
			freshTemplates[this.localName] = new freshTemplate(template.content);
		}

		this.templateInstance = freshTemplates[this.localName].createInstance(this);
		this.attachShadow({mode: 'open'}).appendChild(this.templateInstance.element);
		this.context = {};
	}

	refresh() {
		this.templateInstance.refresh();
	}
}