/*
 * FILENAME:    helios_unit_dialog.js
 * AUTHOR:      Steven Klassen
 * CREATED ON:  2009-11-30
 * 
 * DESCRIPTION: Javascript related to the Helios Unit dialog.
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
 * Dialog used to create a new helios unit.
 */
admin.HeliosUnitDialog = function() {
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
    
    fotech.gui.ValidatingDialog.call(this, 'helios_unit_dialog', cfg, 'helios_unit_form');
    this.validateFields = function() {
        this.validateNotEmpty("host_name", I18n.t('admin.helios_units.helios_unit_dialog.host'));
        this.validateNotEmpty("port", I18n.t('alert.detail_keys.port'));
        this.validateInteger("port", I18n.t('alert.detail_keys.port'), 0);
        var host = $('helios_unit_form')["host_name"].value ;
        var serial_number =$('helios_unit_form')["serial_number"].value
        var name =$('helios_unit_form')["name"].value
        if (serial_number == null || serial_number == "") {$('helios_unit_form')["serial_number"].value = host }
        if (name == null || name == "") {$('helios_unit_form')["name"].value = host }
    }
}

admin.HeliosUnitDialog.prototype = new fotech.gui.ValidatingDialog();

/**
 * Validate and submit the form.
 */
admin.HeliosUnitDialog.prototype.submit = function() {
    if (this.validate()) {
        this.setBusyState();
        new Ajax.Request('/admin/helios_units', { method: 'post', parameters: Form.serialize(this.form) });
    }
}
