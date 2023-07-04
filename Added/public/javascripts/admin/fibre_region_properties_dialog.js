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
admin.FibreRegionPropertiesDialog = function(fibre_id, region_id) {
    var self = this;

    this.fibre_id = fibre_id;
    this.region_id = region_id;

    var cfg = {
        visible: false,
        constraintoviewport: true,
        height: 200,
        postmethod: "manual",
        modal: true,
        y: 100,
        buttons: [
            { text: I18n.t('common.button.dismiss'), handler: function() { self.cancel(); } },
            { text: I18n.t('common.button.submit'), handler: function() { self.submit(); } }
        ]
    };

    fotech.gui.ValidatingDialog.call(this, 'edit_fibre_region_properties_dialog', cfg, 'fibre_region_properties_edit_form');
    this.validateFields = function() {
        this.validateNotEmpty("highlight_colour", "Colour");
        this.validateNotEmpty("highlight_opacity", "Opacity");
        this.validateNotEmpty("highlight_width", "Width");

        var opacity = $('highlight_opacity'), width = $('highlight_width');
        this.validateIntegerValue('highlight_opacity', 'Opacity', opacity.value, 1, 100, true);
        this.validateIntegerValue('highlight_width', 'Width', width.value, 1, 20, true);
    }
};

admin.FibreRegionPropertiesDialog.prototype = new fotech.gui.ValidatingDialog();


/**
 * Validate and submit the form.
 */
admin.FibreRegionPropertiesDialog.prototype.submit = function() {
    if (this.validate()) {
        this.setBusyState();
        new Ajax.Request(this.form.action, { method: 'post', parameters: Form.serialize(this.form) });
    }
};

