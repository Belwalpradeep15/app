/*
 * FILENAME:    form.js
 * AUTHOR:      Steven Klassen
 * CREATED ON:  2010-05-17
 * 
 * LAST CHANGE:
 * $Author$
 *   $Date$
 *    $Rev$
 *    $URL$
 *
 * COPYRIGHT:
 * This file is Copyright © 2010 Fotech Solutions Ltd. All rights reserved.
 */

/**
 * @fileoverview Custom additions to Form objects.
 */
 
/**
 * Check or uncheck all the checkboxes whose name matches 'name'.
 * @param name The name of the checkboxes to change.
 * @param checked If true the checkboxes will be checked otherwise they will be cleared.
 *      Defaults to true if not specified.
 */
HTMLFormElement.prototype.checkAll = function(name, checked) {
    if (typeof(checked) == 'undefined')
        checked = true;
    var len = this.length;
    for (var i = 0; i < len; ++i) {
        var el = this.elements[i];
        if (el.name == name && el.type == 'checkbox')
            el.checked = checked;
    }
}

/**
 * Check and uncheck the checkboxes whose name matches 'name' based on the given set of
 * values. If the checkbox value is in the set then it is selected, otherwise it is
 * unselected. The set of values is a prototype Hash object where the keys are the
 * checkbox values to be selected and the Hash values are almost unimportant. I say "almost"
 * because if you set the values to false or undefined it will not work.
 */
HTMLFormElement.prototype.checkByValue = function(name, values) {
    var len = this.length;
    for (var i = 0; i < len; ++i) {
        var el = this.elements[i];
        if (el.name == name && el.type == 'checkbox')
            el.checked = (values.get(el.value) ? true : false);
    }
}


/**
 * Selects the option whose value matches the given value and unselects all others.
 * @param value The value of the option we want to select.
 */
HTMLSelectElement.prototype.selectByValue = function(value) {
    var len = this.options.length;
    for (var i = 0; i < len; ++i) {
        var opt = this.options[i];
        opt.selected = (opt.value == value ? true : false);
    }
}
