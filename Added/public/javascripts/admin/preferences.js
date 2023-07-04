/*
 * FILENAME:    preferences.js
 * AUTHOR:      Steven Klassen
 * CREATED ON:  2009-12-13
 * 
 * DESCRIPTION: Javascript specific to preference administration.
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

/** Preference namespace. */
admin.preferences = {};

/** Reset all the preferences to their defaults. */
admin.preferences.resetToDefaults = function() {
    disableRow("content");
    new Ajax.Request(prefixOrPortal('/admin') + '/preferences/reset', { method: 'get' });
}

