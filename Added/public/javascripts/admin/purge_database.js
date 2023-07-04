/*
 * FILENAME:    purge_database.js
 * AUTHOR:      Steven Klassen
 * CREATED ON:  2011-01-10
 * 
 * DESCRIPTION: Javascript used by the database purging controller.
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

/** Admin namespace. */
var admin = (admin ? admin : {}); 

/** Purge database namespace. */
admin.purge_database = {};

/** Begin the purge. */
admin.purge_database.begin = function(form) {
    $('begin_purge_button').disabled = true;
    
    var purgeEvents = form.purge_events && form.purge_events.checked;
    var purgeAlerts = form.purge_alerts && form.purge_alerts.checked;
    if (!purgeEvents && !purgeAlerts) {
        alert(I18n.t('admin.purge_database.nothing_selected'));
        $('begin_purge_button').disabled = false;
        return;
    }
    
    var days = parseInt(form.older_than.value);
    if (isNaN(days)) {
        alert(I18n.t('admin.purge_database.invalid_days'));
        $('begin_purge_button').disabled = false;
        return;
    }
    
    if (days < 5) {
        alert(I18n.t('admin.purge_database.too_few_days'));
        $('begin_purge_button').disabled = false;
        return;
    }
    
    $('response').innerHTML = "<p>" + I18n.t('admin.purge_database.please_wait') + "</p>";
    new Ajax.Request('/admin/purge_database/purge', { method: 'post', parameters: Form.serialize(form) });
}

