/*
 * FILENAME:    editable.js
 * AUTHOR:      Steven Klassen
 * CREATED ON:  2008-12-11
 * 
 * DESCRIPTION: Javascript support for 'editable' elements.
 *
 * LAST CHANGE:
 * $Author$
 *   $Date$
 *    $Rev$
 *    $URL$
 *
 * COPYRIGHT:
 * This code comes from http://blog.davglass.com/files/yui/editable/ but has no
 * copyright that I can determine. We have also modified it from the original in
 * order to handle the pressing of the return key and to automatically initialize
 * itself.
 */

/**
 * @fileoverview Support for 'editable' elements. To make an element editable, give
 *   it an 'editable' class and include this javascript file. You will also need to
 *   make the call fotech.gui.initEditableFields() after your editable elements have 
 *   been created.
 */
 
(function() {
 var Dom = YAHOO.util.Dom,
 Event = YAHOO.util.Event;
 
 editable = {
     config: {
     class_name: 'editable'
     },
     init: function() {
         this.clicked = false;
         this.contents = false;
         this.input = false;
         
         var _items = Dom.getElementsByClassName(this.config.class_name);
         Event.addListener(_items, 'dblclick', editable.dbl_click, editable, true);
     },
     dbl_click: function(ev) {
         var tar = Event.getTarget(ev);
         if (!tar) {
         return;
         }
         if (tar.tagName && (tar.tagName.toLowerCase() == 'input')) {
         return false;
         }
         this.check();
         this.clicked = tar;
         this.contents = this.clicked.innerHTML;
         this.make_input();
     },
     make_input: function() {
         this.input = Dom.generateId();
         
         new_input = document.createElement('input');
         new_input.setAttribute('type', 'text');
         new_input.setAttribute('id', this.input);
         new_input.value = this.contents;
         new_input.setAttribute('size', this.contents.length);
         new_input.className = 'editable_input';
         
         this.clicked.innerHTML = '';
         this.clicked.appendChild(new_input);
         new_input.select();
         Event.addListener(new_input, 'blur', editable.check, editable, true);
         Event.addListener(new_input, 'change', editable.check, editable, true);
         this.done = false;
     },
     clear_input: function() {
         if (this.input && !this.done) {
             this.done = true;
             var oldvalue = this.contents;
             var el = this.clicked;
             if (Dom.get(this.input).value.length > 0) {
                 this.clean_input();
                 this.contents_new = Dom.get(this.input).value;
                 this.clicked.innerHTML = this.contents_new;
             } else {
                 this.contents_new = '[removed]'
                 this.clicked.innerHTML = this.contents_new;
             }
             this.callback(el, oldvalue, this.contents_new);
         }
         this.clicked = false;
         this.contents = false;
         this.input = false;
     },
     clean_input: function() {
        checkText   = new String(Dom.get(this.input).value);
        regEx1      = /\"/g;        // " Fix the syntax formatting in xcode
        checkText       = String(checkText.replace(regEx1, ''));
        Dom.get(this.input).value = checkText;
    },
    check: function(ev) {
        if (this.clicked) {
            this.clear_input();
        }
    },
    callback: function(el, oldval, newval) {
        if (this.notify != null && oldval != newval) {
            this.notify(el, oldval, newval);
        }
    },
    notify: null
}
})();


// The following is our fotech wrapper.

/** Fotech namespace. */
var fotech = (fotech ? fotech : {});

/** Fotech gui namespace. */
fotech.gui = (fotech.gui ? fotech.gui : {});

/** Initialize any editable fields. 
 * This should be called after the fields have become available, either by calling it at
 * the end of your page or by using an Event.onAvailable handler.
 * @param valueChangedCB. If set this should be a function taking the parameters 
 *     (el, oldval, newval) that will be called when the value of an editable field has
 *     changed. The el passed to this function is the HTML editable element, specifically
 *     the element that has the class="editable" attribute.
 */
fotech.gui.initEditableFields = function(valueChangedCB) {
    editable.init();
    editable.notify = valueChangedCB;
}
