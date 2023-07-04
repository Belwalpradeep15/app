/*
 * FILENAME:    event_tracking.js
 * AUTHOR:      Steven Klassen
 * CREATED ON:  2010-05-12
 * 
 * DESCRIPTION: Javascript specific to the event tracking administration.
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

/** Admin namespace. */
var admin = (admin ? admin : {}); 

/** Event tracking namespace. */
admin.event_tracking = {};

/** One of the editable fields has been changed. */
admin.event_tracking.editableFieldChanged = function(el, oldval, newval) {
    newval = newval == '[removed]' ? '' : newval.strip();
    if(newval == ''){
        el.innerHTML = oldval;
        alert(I18n.t('admin.invalid_empty_value'));
        return;    
    }

    if (el.attributes['id'].value.substring(0, 5) == "name_")       
        admin.changeField('/admin/event_tracking_configs', el.attributes['id'].value.substring(5), 'name', newval);
    else if (el.attributes['id'].value.substring(0, 11) == "event_type_")
        admin.changeField('/admin/event_tracking_configs', el.attributes['id'].value.substring(11), 'event_type_id', newval);
    else if (el.attributes['id'].value.substring(0, 5) == "time_")
        admin.changeField('/admin/event_tracking_configs', el.attributes['id'].value.substring(5), 'time_difference', newval);
    else if (el.attributes['id'].value.substring(0, 5) == "dist_") {
        var prefs = fotech.gui.rootOpener().user.preferences;
        newval = fotech.util.convert(parseFloat(newval), prefs['units-distance'], 'm');
        admin.changeField('/admin/event_tracking_configs', el.attributes['id'].value.substring(5), 'dist_difference', newval);
    }
    else if (el.attributes['id'].value.substring(0, 10) == "is_active_")
        admin.changeField('/admin/event_tracking_configs', el.attributes['id'].value.substring(10), 'is_active', newval);
    else
        alert(I18n.t('admin.configuration.event_tracking.new_dialog.header') + el.attributes['id'].value);
}

/** Ensure the creation of the dialog. */
admin.event_tracking._event_tracking_dialog = null;
admin.event_tracking._ensureEventTrackingDialog = function() {
    if (!admin.event_tracking._event_tracking_dialog) {
        admin.event_tracking._event_tracking_dialog = new admin.EventTrackingDialog();
        admin.event_tracking._event_tracking_dialog.render(document.body);
    }
}

/** Bring up the dialog for adding a new rule. */
admin.event_tracking.newEventTrackingConfig = function() {
    var dlg = admin.event_tracking.getEventTrackingDialog();
    dlg.clear();
    $('event_tracking_dialog_title').innerText = I18n.t('admin.configuration.event_tracking.new_dialog.header');
    dlg.show();
}

/** Obtain the event tracking dialog, ensuring that it is built first. */
admin.event_tracking.getEventTrackingDialog = function() {
    admin.event_tracking._ensureEventTrackingDialog();
    return admin.event_tracking._event_tracking_dialog;
}


