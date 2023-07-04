/*
 * COPYRIGHT:
 * This file is Copyright © 2016 Fotech Solutions Ltd. All rights reserved.
 */


/** Admin namespace. */
var admin = (admin ? admin : {}); 
admin.marker_types = {};


admin.marker_types.editableFieldChanged = function(el, oldval, newval) {
    newval = newval == '[removed]' ? '' : newval.strip();
    if(newval == ''){
        el.innerHTML = oldval;
        alert(I18n.t('admin.invalid_empty_value'));
        return;    
    }
    
    var id = el.attributes['id'];
    var marker_id = id.value.match(/\d+/g)[1];
    if (id.value.match(/^name_\d+_\d+/))
		admin.changeField('/admin/marker_types', marker_id, 'name', newval);
}


/** Bring up the dialog for adding a new marker. */
admin.marker_types._marker_type_dialog = null;
admin.marker_types.newMarkerType = function() {
    if (!admin.marker_types._marker_type_dialog) {
        admin.marker_types._marker_type_dialog = new admin.MarkerTypeNewDialog();
        admin.marker_types._marker_type_dialog.render(document.body);
    }
    admin.marker_types._marker_type_dialog.show();
}