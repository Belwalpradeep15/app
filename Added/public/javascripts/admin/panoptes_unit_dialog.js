/*
 * FILENAME:    panoptes_unit_dialog.js
 * AUTHOR:      Steven Klassen
 * CREATED ON:  2009-11-30
 * 
 * DESCRIPTION: Javascript related to the Panoptes Unit dialog.
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
 * Dialog used to create a new panoptes unit.
 */
admin.PanoptesUnitDialog = function() {
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
    
    fotech.gui.ValidatingDialog.call(this, 'panoptes_unit_dialog', cfg, 'panoptes_unit_form');
    this.validateFields = function() {
        this.validateNotEmpty("host_name", I18n.t('admin.panoptes_units.panoptes_unit_dialog.host'));
        var host = $('panoptes_unit_form')["host_name"].value ;
        var serial_number =$('panoptes_unit_form')["serial_number"].value
        var name =$('panoptes_unit_form')["name"].value
        if (serial_number == null || serial_number == "") {$('panoptes_unit_form')["serial_number"].value = host }
        if (name == null || name == "") {$('panoptes_unit_form')["name"].value = host }
    }
}

admin.PanoptesUnitDialog.prototype = new fotech.gui.ValidatingDialog();

/**
 * Validate and submit the form.
 */
admin.PanoptesUnitDialog.prototype.submit = function() {
    if (this.validate()) {
        this.setBusyState();
        new Ajax.Request('/admin/panoptes_units', { method: 'post', parameters: Form.serialize(this.form) });
    }
}
