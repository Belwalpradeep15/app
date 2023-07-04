/*
 * FILENAME:    event_types.js
 * AUTHOR:      Rui Zhu
 * CREATED ON:  16-09-22
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

/** Event tracking namespace. */
admin.event_clearing = {};

/** One of the editable fields has been changed. */
admin.event_clearing.editableFieldChanged = function(el, oldval, newval) {
    newval = newval == '[removed]' ? '' : newval.strip();
    if(newval == ''){
        el.innerHTML = oldval;
        alert(I18n.t('admin.invalid_empty_value'));
        return;    
    }
    
    if (el.attributes['id'].value.substring(0, 18) == "clearing_interval_")       
        if( /^\d+$/.test(newval))
            admin.changeField('/admin/event_clearing_configs', el.attributes['id'].value.substring(18), 'clearing_interval', newval);
        else
            alert(I18n.t("admin.configuration.event_clearing.invalid_integer"));
    else
        alert(I18n.t("common.validations.invalid_field") + " " + el.attributes['id'].value);
}

admin.event_clearing.toggleEnabled = function(el){
    var id = parseInt(el.id.match(/\d+/));
    if(el.checked){
        admin.changeField('/admin/event_clearing_configs', id, 'clearing_interval', 5);
        $('clearing_interval_' + id).update(5).show();
    } else {
        admin.changeField('/admin/event_clearing_configs', id, 'clearing_interval', 0);
        $('clearing_interval_' + id).update(0).hide();
    }
}
