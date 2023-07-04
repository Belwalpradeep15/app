/*
 * FILENAME:    preferences.js
 * AUTHOR:      Steven Klassen
 * CREATED ON:  2011-01-22
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
 * This file is Copyright © 2011 Fotech Solutions Ltd. All rights reserved.
 */

// Toggle a system preference based on a menu item.
function toggleSystemPreference(menuItemId, preferenceKey, confirmMessageKey) {
    if (typeof(preferenceKey) == 'undefined')
        preferenceKey = menuItemId;
    if (typeof(confirmMessageKey) == 'undefined')
        confirmMessageKey = "main.menu.admin." + menuItemId + "_confirm";
    
    var item = fotech.gui.getMenuItemById(jsmenubar, menuItemId);
    if (item.cfg.getProperty('checked')){
        _setSystemPreference(preferenceKey,'true');
    } else {
        if(confirm(I18n.t(confirmMessageKey))){
            _setSystemPreference(preferenceKey, 'false');
        } else {
            item.cfg.setProperty('checked', true);
        }
    }
}

function _setSystemPreference(key, value){
    var form = $('update_form');
    form.field.value = key;
    form.value.value = value;
    new Ajax.Request('/admin/system_preferences/0', { method: 'put', parameters:Form.serialize(form) });
}

