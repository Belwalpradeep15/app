/*
 * FILENAME:    dom.js
 * AUTHOR:      Steven Klassen
 * CREATED ON:  2008-09-04
 * 
 * DESCRIPTION:  
 *
 * LAST CHANGE:
 * $Author$
 *   $Date$
 *    $Rev$
 *    $URL$
 *
 * COPYRIGHT:
 * This file is based on one that is copyright (c) by Klassen Software Solutions and
 * is used will all permissions. If desired the original may be obtained from
 * www.kss.cc. All modifications from the original are copyright (c) 2008 Fotech Solutions
 * Ltd. All rights reserved.
 */

/**
 * @fileoverview Classes and methods that are useful for dealing with DOM structures
 *    in a browser independant manner.
 */
 
/** Fotech namespace. */
var fotech = (fotech ? fotech : {});

/** Fotech dom namespace. */
fotech.dom = {};

/**
 * Construct a new Dom utility class.
 * @constructor
 * @param doc The document object to be used by this class.
 *
 * @class
 * The Dom class is used to handle a variety of document related items in a browser
 * independant manner. 
 */
fotech.dom.Dom = function(doc) {
    this.document = doc;
}

/**
 * Set a child element. If the parent already has one or more child nodes the first will be
 * replaced with the given child.
 * @param parent the parent node
 * @param child the node to be set as the child of the parent.
 */
fotech.dom.Dom.prototype.setChild = function(parent, child) {
    if (parent.hasChildNodes())
        parent.replaceChild(child, parent.firstChild);
    else
        parent.appendChild(child);
}

/**
 * Appends a number of text lines to the given parent with a break between each
 * line.
 * @param parent the parent node
 * @param texts either a single text string or an array of text strings
 */
fotech.dom.Dom.prototype.appendText = function(parent, texts) {
	if (texts instanceof Array) {
		for (var i = 0; i < texts.length-1; ++i) {
			parent.appendChild(document.createTextNode(texts[i]));
			parent.appendChild(document.createElement("br"));
		}
		parent.appendChild(document.createTextNode(texts[texts.length-1]));
	}
	else {
		parent.appendChild(document.createTextNode(texts));
	}
}

/**
 * Set attributes on an element. 
 * @param el the DOM element to set the attributes on.
 * @param attrs an associative array mapping from an attribute name to its value. If
 *      null then no attributes are created.
 */
fotech.dom.Dom.prototype.setAttributes = function(el, attrs) {
    if (attrs != null) {
        for (var key in attrs)
            el.setAttribute(key, attrs[key]);
    }
}

/** @private */
fotech.dom.Dom.prototype.__isElementIE = function(o) {
    return ((typeof o.getAttribute == 'function') || (typeof o.getAttribute == 'object'));
}

/** @private */
fotech.dom.Dom.prototype.__isElementStandard = function(o) {
    return (o instanceof Element);
}

/**
 * Determine if an object is an XML or HTML element.
 * @param o the object we are examining.
 * @return true if the object appears to be an element.
 *
 * This is written in a manner that should work with all browsers. It will first
 * attempt using the standard approach. If that fails (such as for IE) it will
 * see if the object has Element methods defined for it. After the correct method
 * has been determine once it will be remembered for future calls on the same
 * page.
 */
fotech.dom.Dom.prototype.isElement = function(o) {
    try {
        var ret = this.__isElementStandard(o);
        fotech.dom.Dom.prototype.isElement = fotech.dom.Dom.prototype.__isElementStandard;
        return ret;
    } catch (e) {
        fotech.dom.Dom.prototype.isElement = fotech.dom.Dom.prototype.__isElementIE;
        return this.__isElementIE(o);
    }
}

/**
 * Change an item withing a CSS class definition.
 *
 * @param className The name of the CSS class to be modified.
 * @param attributeName The name of the CSS attribute to be modified (e.g. 'background-color').
 * @param attributeValue The new value to give the attribute (e.g. 'rgb(255, 128, 23)').
 */
fotech.dom.Dom.prototype.changeClass = function(className, attributeName, attributeValue) {
    
    // Eliminate a boundary condition.
    var noStyleSheets = this.document.styleSheets.length;
    if (noStyleSheets == 0)
        return;
    
    // First we change any matching values.
    var clsName = '.' + className;
    var changedOne = false;
    for (var sIdx = 0; sIdx < noStyleSheets; ++sIdx) {
        var noRules = this.document.styleSheets[sIdx]['cssRules'].length;
        for (var rIdx = 0; rIdx < noRules; ++rIdx) {
            var rule = this.document.styleSheets[sIdx]['cssRules'][rIdx];
            if (rule.selectorText == clsName && rule.style[attributeName]) {
                rule.style[attributeName] = attributeValue;
                changedOne = true;
                break;
            }
        }
    }

    // If there were no matching values then we add one to the first style sheet.
    if (!changedOne) {
        var sheet = this.document.styleSheets[0];
        var attr = attributeName + ':' + attributeValue + ';';
        if (sheet.insertRule)
            sheet.insertRule(clsName + ' { ' + attr + ' } ', sheet['cssRules'].length);
        else if (sheet.addRule)
            sheet.addRule(clsName, attr);
    }
}

/**
 * Determine if an element has a class applied. This is loosely based on some code
 * found at http://www.onlinetools.org/articles/unobtrusivejavascript/cssjsseparation.html .
 *
 * @param el The element or the element id to be examined.
 * @param className The name of the class we are interested in.
 * @return true if the class has been applied to the element.
 */
fotech.dom.Dom.prototype.hasClass = function(el, className) {
    if (!this.isElement(el))
        el = this.document.getElementById(el);
    var re = new RegExp("\\b" + className + "\\b");
    return re.test(el.className);
}

/**
 * Perform an operation on the given element and all its children. Note that the
 * operation is only called on element type children.
 *
 * @param parent The top-level element. 
 * @param op A method that takes an element as its only argument.
 */
fotech.dom.Dom.prototype.forEach = function(el, op) {
    if (el.nodeType == 1)
        op(el);
    if (el.hasChildNodes()) {
        for (var i = 0; i < el.childNodes.length; ++i)
            this.forEach(el.childNodes[i], op);
    }
}

/**
 * The constructor requires that the Dom object and the id of the table be
 * passed in. We search for the table in the document and keep a reference to
 * it in our object.
 * @param dom a fotech.dom.Dom object for the page including the table
 * @param tableId the id attribute of the table we are interested in.
 * @throws Error if there is no table of the given id.
 *
 * @class
 * Table DOM class. This contains methods that make it easier to deal with table objects.
 */
fotech.dom.Table = function(dom, tableId) {
    this.dom = dom;
    this.table = this.dom.document.getElementById(tableId);
    if (this.table == null)
        throw new Error("Could not find the table " + tableId + " in the document.");
}

/**
 * Insert a new row into the table at the given position. If pos is -1 the row will
 * be appended to the end of the table. If attrs is specified they will be added as
 * attributes to the "tr" object.
 * @param pos the position for the new row. If -1 the row will be appended to the end.
 * @param attrs a map of attributes to be added to the new "tr" element. (optional)
 * @param cells an array of cell objects to be added to the new "tr" element. Note that
 *      this is not an array of "td" elements but an array of contents to be
 *      placed into "td" elements. (optional)
 * @return The new tr object.
 */
fotech.dom.Table.prototype.insertRow = function(pos, attrs, cells) {
    var tr = this.table.insertRow(pos);
    this.dom.setAttributes(tr, attrs);
    if (cells != null) {
        for (var i = 0; i < cells.length; ++i)
            this.insertCell(tr, -1, null, cells[i]);
    }
    return tr;
}

/**
 * Append a new row to the end of the table. Functionally equivalent to calling
 * insertRow(-1, attrs).
 */
fotech.dom.Table.prototype.appendRow = function(attrs) {
    return this.insertRow(-1, attrs);
}

/**
 * Insert a cell into a table row.
 * @param row the "tr" element to add the cell to
 * @param pos the postion for the new cell. If -1 the cell will be appended to the end.
 * @param attrs a map of attributes to be added to the new "td" element. (optional)
 * @param contents If a dom element it will be added as a child to the new "td" element. If
 *      text a text element will be added as a child to the new "td" element. (optional)
 * @return the new "td" element.
 */
fotech.dom.Table.prototype.insertCell = function(row, pos, attrs, contents) {
    var td = row.insertCell(pos);
    this.dom.setAttributes(td, attrs);
    if (contents != null) {
        if (this.dom.isElement(contents))
            td.appendChild(contents);
        else
            td.appendChild(this.dom.document.createTextNode(contents));
    }
    return td;
}

/**
 * Append a new cell to the end of the row. Functionally equivalent to the call
 * insertCell(row, -1, attrs, contents).
 */
fotech.dom.Table.prototype.appendCell = function(row, attrs, contents) {
    return this.insertCell(row, -1, attrs, contents);
}


// Browser specific versions of the parse function.
fotech.dom._parse_Mozilla = function(text) {
    return (new DOMParser()).parseFromString(text, "application/xml");
}

fotech.dom._parse_IE = function(text) {
    var doc = XML.newDocument();  // Create an empty document
    doc.loadXML(text);            // Parse text into it
    return doc;                   // Return it
}

fotech.dom._parse_General = function(text) {
    var url = "data:text/xml;charset=utf-8," + encodeURIComponent(text);
    var request = new XMLHttpRequest();
    request.open("GET", url, false);
    request.send(null);
    return request.responseXML;
}    

/**
 * Parse some XML text and return the result as a Document object.
 * This is a cross-browser solution that is based on some code found at
 * http://jmvidal.cse.sc.edu/talks/javascriptxml/allslides.xml.
 *
 * @param text The XML string to parse.
 * @return the Document object.
 */
fotech.dom.parse = function(text) {
    // Determine which method to use for this browser and save that information for future calls.
    if (typeof DOMParser != "ftp://ftp.") {
        // Mozilla, Firefox, and related browsers
        fotech.dom.parse = fotech.dom._parse_Mozilla;
    }
    else if (typeof ActiveXObject != "undefined") {
        // Internet Explorer.
        fotech.dom.parse = fotech.dom._parse_IE;
    }
    else {
        // As a last resort, try loading the document from a data: URL
        // This is supposed to work in Safari.  Thanks to Manos Batsis and
        // his Sarissa library (sarissa.sourceforge.net) for this technique.
        fotech.dom.parse = fotech.dom._parse_General;
    }
    return fotech.dom.parse(text);
}


////
//// Element extensions
////

/**
 * Obtain the child text of an element. This will return null if there are no child
 * text nodes, otherwise it will return all the text nodes catenated together into
 * a single string.
 * @return the child text.
 */
Element.prototype.getText = function() {
    if (!this.hasChildNodes())
        return null;
    var text = "";
    for (var i = 0; i < this.childNodes.length; ++i)
        text += this.childNodes[i].nodeValue;
    return text;
}

/**
 * Obtain the child text of a named element. This is functionally equivalent to calling
 * this.getElementsByTagName(tagName)[0].getText() with the appropriate null checks.
 * @return the child text.
 */
Element.prototype.getTextByTagName = function(tagName) {
    var children = this.getElementsByTagName(tagName);
    if (children == null || children.length == 0)
        return null;
    return children[0].getText();
}

/**
 * Return an array of floating point values from a Float-1D element.
 * @return an array of floating point values.
 */
Element.prototype.getFloat1D = function() {
    var noValues = parseInt(this.getAttribute('no-values'));
    var ar = [];
    var strs = this.getText().split(',');
    if (strs.length != noValues)
        throw "Invalid XML: no-values attribute does not agree with the number of elements in the string";
    for (var i = 0; i < strs.length; ++i)
        ar[i] = parseFloat(strs[i]);
    return ar;
}
