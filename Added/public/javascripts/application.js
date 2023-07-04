/*
 * FILENAME:    application.js
 * AUTHOR:      Steven Klassen
 * CREATED ON:  2009-04-09
 *
 * DESCRIPTION: Javascript common to the app/admin application.
 *
 * LAST CHANGE:
 * $Author$
 *   $Date$
 *    $Rev$
 *    $URL$
 *
 * COPYRIGHT:
 * This file is Copyright (c) 2009 Fotech Solutions Ltd. All rights reserved.
 */


// Disable a row in a table.
function disableRow(rowid) {
    var el = $(rowid);
    if (el)
        el.addClassName('disabled');
}

// Enable a row in a table.
function enableRow(rowid) {
    var el = $(rowid);
    if (el)
        el.removeClassName('disabled');
}

// Remove a row from a table.
function removeRow(rowid) {
    var el = document.getElementById(rowid);
    var table = el.parentNode;
    while (table != null && table.nodeName != "TABLE")
        table = table.parentNode;
    if (table != null)
        table.deleteRow(el.rowIndex);
}

// Set the status message. You can pass in a text message, a DOM element, or both.
function setStatusMessage(msg, el) {
    var status_element = $('status');
    status_element.update("");
    if (msg != null){
        Element.insert(status_element, { bottom: msg });
        if(msg != "")
            Event.fire(fotech.gui.rootOpener(), 'statusMessage:add', {msg:msg, time:new Date})
    }
    if (el != null)
        Element.insert(status_element, { bottom: el });
}

// Set the message at the top of the screen. Mostly we are using this to display the fibre
// lines.
function setViewStatus(message) {
    var el = $('view_status');
    if (el)
        el.innerHTML = message;
};


// Set the map missing warning.
function setMapUnavailableMessage() {
    setStatusMessage(I18n.t('common.status_message.google_maps_not_available'));
}

function restartServices(){
    if(confirm(I18n.t('admin.panoptes.restart_services.confirm'))){
        new Ajax.Request('/admin/panoptes/restart_services', {method: 'get'})
    }
}

function restartSystem(){
    if(confirm(I18n.t('admin.panoptes.restart_system.confirm'))){
        new Ajax.Request('/admin/panoptes/restart_system', {method: 'get'})
    }
}

function prefixOrPortal(prefix){
    if (window.location.pathname.startsWith('/portal')) {
        return '/portal';
    }
    return prefix
}

function setUserMaplayerPreference(val) {
    new Ajax.Request('/admin/preferences/update/', { method: 'put', parameters: { field: "initial-map-type", value: val, authenticity_token: authenticityToken} });
}

