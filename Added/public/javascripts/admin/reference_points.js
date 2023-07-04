/*
 * FILENAME:    reference_points.js
 * AUTHOR:      Karina Simard
 * CREATED ON:  10-09-12
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
admin.reference_points = {};
// An editable field has changed. We reroute based on what element caused this to occur.
admin.reference_points.editableFieldChanged = function(el, oldval, newval) {
    newval = newval == '[removed]' ? '' : newval.strip();
    if(newval == ''){
        el.innerHTML = oldval;
        alert(I18n.t('admin.invalid_empty_value'));
        return;    
    }
    
    var id = el.attributes['id'];
    var org_id = id.value.match(/\d+/g)[0];
    var ref_point_id = id.value.match(/\d+/g)[1];
    if (id.value.match(/^label_\d+_\d+/))
		admin.changeField('/admin/organizations/'+org_id+'/reference_points', ref_point_id, 'label', newval);
    if (id.value.match(/^latlng_\d+_\d+/)){
        var prefs = fotech.gui.rootOpener().user.preferences;
        var latlng_units = prefs['units-latlng'];
        var latlng_precision = prefs['precision-latlng'];
        var converted = new LatLon(newval.split(',')[0],newval.split(',')[1]);
        var converted = converted._lat + "," + converted._lon;
        if(/^ *-?\d+(\.\d+)?, *-?\d+(\.\d+)? *$/.match(converted)){
            converted = converted.gsub(' ','');
            admin.changeField('/admin/organizations/'+org_id+'/reference_points', ref_point_id, 'latlng', converted);
            el.innerHTML = newval;
        }
        else{
            el.innerHTML = oldval;
            alert(I18n.t('admin.helios_units.invalid_lat_lng'));
            return;
        }
    }
}

/** Bring up the dialog for adding a new reference_point. */
admin.reference_points._reference_point_dialog = null;
admin.reference_points.newReferencePoint = function(org_id) {
    if (!admin.reference_points._reference_point_dialog) {
        admin.reference_points._reference_point_dialog = new admin.ReferencePointNewDialog(org_id);
        admin.reference_points._reference_point_dialog.render(document.body);
    }
    admin.reference_points._reference_point_dialog.show();
}

admin.reference_points._reference_point_section_location_dialog = null;
admin.reference_points.editReferencePointSectionLocation = function(org_id,ref_point_id){
    if (!admin.reference_points._reference_point_section_location_dialog) {
        admin.reference_points._reference_point_section_location_dialog = new admin.ReferencePointSectionLocationDialog(org_id, ref_point_id);
        admin.reference_points._reference_point_section_location_dialog.render(document.body);
    } else {
        admin.reference_points._reference_point_section_location_dialog.organization_id = org_id;
        admin.reference_points._reference_point_section_location_dialog.reference_point_id = ref_point_id;
        admin.reference_points._reference_point_section_location_dialog.form = $('reference_point_section_location_form');
    }
    admin.reference_points._reference_point_section_location_dialog.show();
}
