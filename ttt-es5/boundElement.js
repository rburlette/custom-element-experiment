'use strict';
var _slicedToArray = function () { function sliceIterator(arr, i) { var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"]) _i["return"](); } finally { if (_d) throw _e; } } return _arr; } return function (arr, i) { if (Array.isArray(arr)) { return arr; } else if (Symbol.iterator in Object(arr)) { return sliceIterator(arr, i); } else { throw new TypeError("Invalid attempt to destructure non-iterable instance"); } }; }();

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _get = function get(object, property, receiver) { if (object === null) object = Function.prototype; var desc = Object.getOwnPropertyDescriptor(object, property); if (desc === undefined) { var parent = Object.getPrototypeOf(object); if (parent === null) { return undefined; } else { return get(parent, property, receiver); } } else if ("value" in desc) { return desc.value; } else { var getter = desc.get; if (getter === undefined) { return undefined; } return getter.call(receiver); } };

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var textNodeRegEx = /{{\s*([^}]+)\s*}}/g;
var emptyArray = [];

var stats = {
    numFunctionsCreated: 0,
    numFunctionCalls: 0,
    numUpdates: 0,
    regExes: 0,
    nodesWalked: 0,
    treeWakersMade: 0
};

var binder = function () {
    function binder(node, evalFunc, defaultValue, accessor) {
        _classCallCheck(this, binder);

        this.node = node;
        this.evalFunc = evalFunc;
        this.defaultValue = defaultValue;
        this.accessor = accessor;
    }

    _createClass(binder, [{
        key: 'hasChanged',
        value: function hasChanged(newValue) {
            return newValue !== this.oldValue;
        }
    }, {
        key: 'process',
        value: function process(thisArg, context) {
            var newValue = this.defaultValue;
            stats.numFunctionCalls++;
            try {
                newValue = this.evalFunc.call(thisArg, context ? context.item : undefined, context);
            } catch (err) {}

            if (this.hasChanged(newValue)) {
                this.update(newValue, context);
                this.oldValue = newValue;
                stats.numUpdates++;
            }
        }
    }]);

    return binder;
}();

var defaultBinder = function (_binder) {
    _inherits(defaultBinder, _binder);

    function defaultBinder(element, attributeName, evalFunc, accessor) {
        _classCallCheck(this, defaultBinder);

        var _this2 = _possibleConstructorReturn(this, (defaultBinder.__proto__ || Object.getPrototypeOf(defaultBinder)).call(this, element, evalFunc, null, accessor));

        _this2.attributeName = attributeName;
        return _this2;
    }

    _createClass(defaultBinder, [{
        key: 'update',
        value: function update(newValue, context) {
            if (this.attributeName in this.node) {
                this.node[this.attributeName] = newValue;
                return;
            }

            if (newValue === null) this.node.removeAttribute(this.attributeName);else this.node.setAttribute(this.attributeName, newValue);
        }
    }]);

    return defaultBinder;
}(binder);

var textNodeBinder = function (_binder2) {
    _inherits(textNodeBinder, _binder2);

    function textNodeBinder(textNode, evalFunc, accessor) {
        _classCallCheck(this, textNodeBinder);

        var _this3 = _possibleConstructorReturn(this, (textNodeBinder.__proto__ || Object.getPrototypeOf(textNodeBinder)).call(this, textNode, evalFunc, '', accessor));

        textNode.nodeValue = '\u200B';
        return _this3;
    }

    _createClass(textNodeBinder, [{
        key: 'update',
        value: function update(newValue, context) {
            if (newValue === null) this.node.nodeValue = '\u200B';else this.node.nodeValue = newValue;
        }
    }]);

    return textNodeBinder;
}(binder);

var showBinder = function (_binder3) {
    _inherits(showBinder, _binder3);

    function showBinder(element, evalFunc, owner, accessor) {
        _classCallCheck(this, showBinder);

        var _this4 = _possibleConstructorReturn(this, (showBinder.__proto__ || Object.getPrototypeOf(showBinder)).call(this, element, evalFunc, false, accessor));

        _this4.owner = owner;
        _this4.oldValue = false;
        return _this4;
    }

    _createClass(showBinder, [{
        key: 'hasChanged',
        value: function hasChanged(newValue) {
            return true;
        }
    }, {
        key: 'initialize',
        value: function initialize() {
            this.parentNode = this.node.parentNode;
            this.nextSibling = document.createComment("show");
            this.parentNode.insertBefore(this.nextSibling, this.node.nextElementSibling);
            this.node.remove();
            this.boundElement = new boundElement(this.node, this.owner);
        }
    }, {
        key: 'update',
        value: function update(newValue, context) {
            if (newValue) this.boundElement.refresh(context);

            if (newValue === this.oldValue) return;

            if (newValue) this.parentNode.insertBefore(this.node, this.nextSibling);else this.node.remove();
        }
    }]);

    return showBinder;
}(binder);

var boundElement = function () {
    function boundElement(element, owner, funcStore) {
        _classCallCheck(this, boundElement);

        this.children = [];
        this.binders = [];
        this.matches = [];
        this.element = element;
        this.owner = owner;
        this.funcNum = 0;
        this.funcStore = funcStore || [];
        this.ooElements = [];
        this.parents = [null];
        this.nodeCounts = [-1];
        this.currentLevel = 0;
        if (element.attributes) this.bindAttributes(element);

        this.bindNodes();
    }

    _createClass(boundElement, [{
        key: 'makeNodeAccessor',
        value: function makeNodeAccessor() {
            var newArray = [];

            for (var i = 0; i <= this.currentLevel; i++) {
                newArray.push(this.nodeCounts[i]);
            }

            return newArray;
        }
    }, {
        key: 'makeFuncFromString',
        value: function makeFuncFromString(evalStr) {
            if (this.funcStore[this.funcNum]) {
                return this.funcStore[this.funcNum++];
            }

            stats.numFunctionsCreated++;

            try{
                return this.funcStore[this.funcNum++] = new Function('item', 'context', 'return (' + evalStr + ');');
            }
            catch(error) {
                if(evalStr.substring(0, 6) == '(e) =>') {
                    evalStr = evalStr.replace('(e) =>', '(function(e) {') + '}).bind(this)';
                    return this.funcStore[this.funcNum++] = new Function('item', 'context', 'return (' + evalStr + ');');
                }
            }
        }
    }, {
        key: 'bindNodes',
        value: function bindNodes() {
            var walker = this.buildTreeWalker(this.element);
            stats.treeWakersMade++;
            var currentNode = void 0;

            while (currentNode = walker.nextNode()) {
                stats.nodesWalked++;
                switch (currentNode.nodeType) {
                    case 3:
                        this.bindTextNodes(currentNode);
                        break;
                    case 1:
                        this.bindAttributes(currentNode);
                        break;
                }
            }

            this.binders = this.children.concat(this.binders);

            for (var i = 0, len = this.children.length; i < len; i++) {
                this.children[i].initialize();
            }
        }
    }, {
        key: 'buildTreeWalker',
        value: function buildTreeWalker(element) {
            var _this = this;

            function acceptNode(node) {
                if (node.parentElement === _this.parents[_this.currentLevel]) {
                    _this.nodeCounts[_this.currentLevel]++;
                } else if (node.parentElement === _this.parents[_this.currentLevel - 1]) {
                    _this.currentLevel -= 1;
                    _this.nodeCounts[_this.currentLevel]++;
                } else {
                    _this.currentLevel += 1;
                    _this.nodeCounts[_this.currentLevel] = 0;
                    _this.parents[_this.currentLevel] = node.parentElement;
                }

                switch (node.nodeType) {
                    case 8:
                        return NodeFilter.FILTER_REJECT;
                    case 3:
                        if (node.nodeValue.length < 5) return NodeFilter.FILTER_REJECT;

                        return NodeFilter.FILTER_ACCEPT;
                    case 1:

                        switch (node.nodeName) {
                            case 'STYLE':
                            case 'SCRIPT':
                                return NodeFilter.FILTER_REJECT;
                            default:
                                if (node.tagName == "TTT-BOARD") {
                                    _this.ooElements.push(node);
                                }

                                var attr = node.dataset.rpt;

                                if (attr) {
                                    _this.children.push(new repeatBinder(node, _this.makeFuncFromString(attr), _this.owner, _this.makeNodeAccessor()));
                                    return NodeFilter.FILTER_REJECT;
                                }

                                attr = node.dataset.show;

                                if (attr) {
                                    _this.children.push(new showBinder(node, _this.makeFuncFromString(attr), _this.owner, _this.makeNodeAccessor()));
                                    return NodeFilter.FILTER_REJECT;
                                }

                                return NodeFilter.FILTER_ACCEPT;
                        }
                    case 8:
                        return NodeFilter.FILTER_REJECT;
                }
            }

            // Work around Internet Explorer wanting a function instead of an object.
            // IE also *requires* this argument where other browsers don't.
            var safeFilter = acceptNode;
            safeFilter.acceptNode = acceptNode;

            return document.createTreeWalker(element, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_COMMENT, safeFilter, false);
        }
    }, {
        key: 'bindTextNodes',
        value: function bindTextNodes(node) {
            var match = void 0;
            var matchNum = 0;
            var lastMatch = 0;
            var position = this.nodeCounts[this.currentLevel];
            stats.regExes++;

            while (match = textNodeRegEx.exec(node.nodeValue)) {
                if (match.index != 0) position++;

                if (match.index > lastMatch) position++;

                this.matches[matchNum++] = {
                    evalText: match[1],
                    startIndex: match.index,
                    endIndex: textNodeRegEx.lastIndex,
                    position: position
                };

                lastMatch = textNodeRegEx.lastIndex;
            }

            if (matchNum === 0) return;

            var count = this.nodeCounts[this.currentLevel];

            // go backward, so as not to lose the reference for our original node
            for (var i = matchNum - 1, thisMatch; i >= 0; i--) {
                thisMatch = this.matches[i];

                // if the end of our match is not the end of the text node, cut off the end
                if (node.nodeValue.length > thisMatch.endIndex) node.splitText(thisMatch.endIndex);

                this.nodeCounts[this.currentLevel] = thisMatch.position;

                // if we are not at the beginning of the text node, split it, so our bound text node
                // starts right at the binding point
                this.binders.push(new textNodeBinder(thisMatch.startIndex != 0 ? node.splitText(thisMatch.startIndex) : node, this.makeFuncFromString(thisMatch.evalText), this.makeNodeAccessor()));
            }
        }
    }, {
        key: 'bindAttributes',
        value: function bindAttributes(element) {
            var attrName = void 0;

            for (var i = element.attributes.length - 1; i >= 0; i--) {
                attrName = element.attributes[i].name;

                if (attrName[0] === '[' && attrName[attrName.length - 1] === ']') {
                    this.binders.push(new defaultBinder(element, attrName.substring(1, attrName.length - 1), this.makeFuncFromString(element.attributes[i].value), this.makeNodeAccessor()));

                    element.removeAttribute(attrName);
                }
            }
        }
    }, {
        key: 'refresh',
        value: function refresh(context) {
            context = context || {};
            context.binder = this;

            for (var i = 0, len = this.binders.length; i < len; i++) {
                this.binders[i].process(this.owner, context || { binder: this });
            }
        }
    }, {
        key: 'getStats',
        value: function getStats() {
            return stats;
        }
    }, {
        key: 'resetStats',
        value: function resetStats() {
            stats.numFunctionsCreated = 0;
            stats.numFunctionCalls = 0;
            stats.numUpdates = 0;
        }
    }]);

    return boundElement;
}();

var repeatBinder = function (_binder4) {
    _inherits(repeatBinder, _binder4);

    function repeatBinder(element, evalFunc, owner, accessor) {
        _classCallCheck(this, repeatBinder);

        var _this5 = _possibleConstructorReturn(this, (repeatBinder.__proto__ || Object.getPrototypeOf(repeatBinder)).call(this, element, evalFunc, emptyArray, accessor));

        _this5.owner = owner;
        return _this5;
    }

    _createClass(repeatBinder, [{
        key: 'initialize',
        value: function initialize() {
            this.parentNode = this.node.parentNode;
            this.nextSibling = document.createComment("repeater");
            this.parentNode.insertBefore(this.nextSibling, this.node.nextElementSibling);
            this.node.remove();
            this.prevLength = 0, this.rows = [];
            this.funcStore = [];
        }
    }, {
        key: 'hasChanged',
        value: function hasChanged(newValue) {
            return true;
        }
    }, {
        key: 'update',
        value: function update(newValue, context) {
            var newLength = newValue.length;
            var rowsLength = this.rows.length;

            for (var i = 0, currentRow; i < newLength; i++) {
                if (i >= rowsLength) this.rows[i] = new boundElement(this.node.cloneNode(true), this.owner, this.funcStore);

                currentRow = this.rows[i];

                currentRow.refresh({
                    parent: context,
                    item: newValue[i],
                    index: i,
                    binder: currentRow
                });

                if (i >= this.prevLength) {
                    this.nextSibling.parentNode.insertBefore(currentRow.element, this.nextSibling);
                }
            }

            if (newLength < this.prevLength) {
                for (var _i = newLength; _i < this.prevLength; _i++) {
                    console.log('removing row: ' + _i);
                    try {
                        this.rows[_i].element.remove();
                    } catch (error) {
                        console.log(error);
                    }
                }
            }

            this.prevLength = newLength;
        }
    }]);

    return repeatBinder;
}(binder);