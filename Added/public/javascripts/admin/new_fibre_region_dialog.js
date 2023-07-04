/*
 * FILENAME:    new_fibre_region_dialog.js
 * AUTHOR:      Karina Simard
 * CREATED ON:  10-10-07
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
 * This file is Copyright © 2010 Fotech Solutions Ltd. All rights reserved.
 */

/**
 * @fileoverview ...add brief description of the file...
 */

/** Admin namespace. */
var admin = (admin ? admin : {});

/**
 * Dialog used to create a new helios unit.
 */
admin.NewRegionDialog = function(fibre_id) {
    var self = this;
    this.fibre_id = fibre_id;
    var cfg = {
    visible: false,
    constraintoviewport: true,
    postmethod: "manual",
    xy: [50,70],
    buttons: [
              { text: fotech.gui.labels.dismiss, handler: function() { self.cancel(); } },
              { text: fotech.gui.labels.save, handler: function() { self.submit(); } }
              ]
    };

    fotech.gui.ValidatingDialog.call(this, 'new_region_dialog', cfg, 'new_region_form');
    this.validateFields = function() {
        var prefs = fotech.gui.rootOpener().user.preferences;
        var distance_units = prefs['units-distance'];
        var distance_precision = prefs['precision-distance'];

        var fibre_zero_point = fotech.util.convert(parseFloat($F('fibre_zero_point')), 'm', distance_units, distance_precision);
        var fibre_active_length = fotech.util.convert(parseFloat($F('fibre_active_length')), 'm', distance_units, distance_precision);
        var fibre_start = fotech.util.convert(0 - fibre_zero_point, distance_units, distance_units, distance_precision);
        var fibre_end = fotech.util.convert(fibre_zero_point + fibre_active_length, distance_units, distance_units, distance_precision);

        this.validateNotEmpty('fibre_region[description]', I18n.t('common.headers.description'));
        this.validateNotEmpty('fibre_region[starting_position]', I18n.t('admin.fibre_region.starting_position'));
        var valid_start = this.validateFloat('fibre_region[starting_position]', I18n.t('admin.fibre_region.starting_position'), fibre_start, fibre_end);

        if(valid_start){
            var region_start = parseFloat($F('fibre_region_starting_position'));
            var isValid = this.validateNotEmpty('fibre_region[ending_position]', I18n.t('admin.fibre_region.end'));
            isValid = isValid && this.validateFloat('fibre_region[ending_position]', I18n.t('admin.fibre_region.end'), region_start, fibre_end);
            if(isValid){
                this.form['fibre_region[length]'].value = parseFloat(this.form['fibre_region[ending_position]'].value) - region_start;
            }
        }

        if(!this.hasError()){
            $('fibre_region_starting_position').value = fotech.util.convert(parseFloat($F('fibre_region_starting_position')), distance_units,'m');
            $('fibre_region_length').value = fotech.util.convert(parseFloat($F('fibre_region_length')), distance_units, 'm');
        }
    }
}

admin.NewRegionDialog.prototype = new fotech.gui.ValidatingDialog();

/**
 * Validate and submit the form.
 */
admin.NewRegionDialog.prototype.submit = function() {
    if (this.validate()) {
        this.setBusyState();
        var self = this;
        new Ajax.Request(location.href,
                         {  method: 'post',
                         parameters: Form.serialize(this.form)
                         });
    }
}
