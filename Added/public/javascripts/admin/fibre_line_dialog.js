/*
 * FILENAME:    fibre_line_dialog.js
 * AUTHOR:      Steven Klassen
 * CREATED ON:  2009-11-07
 * 
 * DESCRIPTION: Javascript related to the fibre line dialog.
 *
 * LAST CHANGE:
 * $Author$
 *   $Date$
 *    $Rev$
 *    $URL$
 *
 * COPYRIGHT:
 * This file is Copyright © 2009 Fotech Solutions Ltd. All rights reserved.
 */


/** Admin namespace. */
var admin = (admin ? admin : {}); 



/**
 * Dialog related to creating a new fibre line.
 */
admin.newFibreLineDialog = function() {
    var self = this;
    var cfg = {
    visible: false,
    constraintoviewport: true,
    postmethod: "manual",
    buttons: [
              { text: fotech.gui.labels.dismiss, handler: function() { self.cancel(); } },
              { text: fotech.gui.labels.submit, handler: function() { self.submit(); } }
              ]
    };
    
    fotech.gui.ValidatingDialog.call(this, 'fibre_line_dialog', cfg, 'fibre_line_form');
    this.validateFields = function() {
        this.validateNotEmpty("name", "Fibre name");
    }
}

admin.newFibreLineDialog.prototype = new fotech.gui.ValidatingDialog();


/**
 * Validate and submit the form.
 */
admin.newFibreLineDialog.prototype.submit = function() {
    if (this.validate()) {
        this.setBusyState();
        new Ajax.Request('/admin/fibre_lines', { method: 'post', parameters: Form.serialize(this.form) });
    }
}
