/*
 * FILENAME:    fibre_regions.js
 * AUTHOR:      Karina Simard
 * CREATED ON:  10-10-06
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

/** Helios units namespace. */
admin.fibre_regions = {};

// An editable field has changed. We reroute based on what element caused this to occur.
admin.fibre_regions.editableFieldChanged = function(el, oldval, newval) {
    newval = newval == '[removed]' ? '' : newval.strip();
    if(newval == ''){
        el.innerHTML = oldval;
        alert(I18n.t('admin.invalid_empty_value'));
        return;
    }
    var id = el.attributes['id'];
    var prefs = fotech.gui.rootOpener().user.preferences;
    var distance_unit = prefs['units-distance'];
    var region_id = id.value.match(/_(\d+)$/)[1];

    var fibre_start = fotech.util.convert(parseFloat($F('fibre_zero_point')), 'm', distance_unit);
    var fibre_length = fotech.util.convert(parseFloat($F('fibre_active_length')), 'm', distance_unit);

    if (id.value.match(/^description_\d+/))
        admin.changeField(location.href, id.value.match(/_(\d+)$/)[1], 'description', newval);

    try {
        if (id.value.match(/^starting_position_\d+/)){
            //validate float
            var er = I18n.t('admin.fibre_region.errors.invalid_float');
            var ending_position = parseFloat($('ending_position_'+region_id).innerHTML);

            var is_valid = newval.match(/^[+-]?((\d+(\.\d*)?)|\.\d+)([eE][+-]?[0-9]+)?$/);
            if(!is_valid) throw(I18n.t('admin.fibre_region.errors.invalid_float'));

            var newvalFloat = parseFloat(newval);
            is_valid = newvalFloat >= 0
            if(!is_valid) throw(I18n.t('admin.fibre_region.errors.start_must_be_positive'));

            is_valid = newvalFloat < ending_position;
            if(!is_valid) throw(I18n.t('admin.fibre_region.errors.start_less_than_end'));

            newval = fotech.util.convert(parseFloat(newval), distance_unit, 'm');
            var new_length = fotech.util.convert(parseFloat(ending_position-newval), distance_unit, 'm');

            admin.changeField(location.href, region_id, 'starting_position', newval);
            admin.changeField(location.href,region_id, 'length', new_length);

        }
        if (id.value.match(/^ending_position_\d+/)){
            //validate float
            var er = I18n.t('admin.fibre_region.errors.invalid_end');
            var starting_position = parseFloat($('starting_position_'+region_id).innerHTML);

            var is_valid = newval.match(/^[+-]?((\d+(\.\d*)?)|\.\d+)([eE][+-]?[0-9]+)?$/);
            if(!is_valid) throw(I18n.t('admin.fibre_region.errors.invalid_float'));

            var newvalFloat = parseFloat(newval);

            is_valid = newvalFloat > 0
            if(!is_valid) throw(I18n.t('admin.fibre_region.errors.end_must_be_positive'));

            is_valid = newvalFloat > starting_position;
            if(!is_valid) throw(I18n.t('admin.fibre_region.errors.end_greater_than_start'));

            newval = fotech.util.convert(newvalFloat, distance_unit, 'm');
            admin.changeField(location.href,region_id, 'length', newval-starting_position);
        }
    } catch (ex) {
        alert(ex);
        el.innerHTML = oldval;
    }
}


admin.FibreRegionsController = function(authToken) {
    this.authenticityToken = authToken;
};

admin.FibreRegionsController.prototype.newFibreRegion = function(fibre_id) {
    _new_fibre_regions_dialog = new admin.NewRegionDialog(fibre_id);
    _new_fibre_regions_dialog.render(document.body);
    _new_fibre_regions_dialog.show();
};

admin.FibreRegionsController.prototype.editFibreRegionProperties = function(fibre_id, region_id) {
    new Ajax.Updater('edit_fibre_region_properties_dialog', '/admin/fibre_lines/' + fibre_id + '/fibre_regions/' + region_id + '/edit_properties', {
        method: 'get',
        parameters: { authenticity_token: this.authenticityToken },
        onComplete: function(request) {
            _edit_fibre_region_properties_dialog = new admin.FibreRegionPropertiesDialog(fibre_id, region_id);
            _edit_fibre_region_properties_dialog.render(document.body);
            _edit_fibre_region_properties_dialog.show();
            jscolor.init();
        }
    });
};
