/*
 * FILENAME:    application.js
 * AUTHOR:      Steven Klassen
 * CREATED ON:  2009-02-24
 *
 * DESCRIPTION: Javascript related to the state of the application. This file contains the
 *              methods and objects that all the windows, including the popup windows, are
 *              allowed to call. Items not in the method should be considered private to
 *              their intended contexts.
 *
 *              When trying to determine if something belongs in this file or not, ask yourself
 *              two questions:
 *              1. Is this part of the overall application state vs. something local to a window?
 *              2. Is it likely that a popup window will want to access this?
 *
 * LAST CHANGE:
 * $Author: sklassen $
 *   $Date: 2009-08-31 10:14:43 -0600 (Mon, 31 Aug 2009) $
 *    $Rev: 1257 $
 *    $URL: https://hockleyd.homeunix.net/svn/trunk/app/monitor/monitor-rails/public/javascripts/application.js $
 *
 * COPYRIGHT:
 * This file is Copyright (c) 2009 Fotech Solutions Ltd. All rights reserved.
 */

// Current user of the system. This object will include id, name, login, organizationIds,
// permissions, roles, and preferences properties.
//
// The permissions property is a hash of all the permissions the user has. The permission
// has the form of 'can' followed by the privilege followed by the context. For example,
//      if (user.permissions['canManageFibreLines'])
// Note that the permissions and contexts have their underscores removed and the first
// letter of each word capitalized.
//
// The roles property is a hash of all the roles the user has. This can be used in an
// if statement as follows:   if (user.roles['organization_tech'])
// Note that each role is specified exactly, no underscore removal or capitalization
// is done.
//
// For a complete description of the possible roles and permissions see the authorization_rules.rb
// file.
//
// The preferences property is a hash of all the user preferences for this user. It will be
// a simple key, value hash where the key is the key as given in the preferences.xml file and
// the value will be the current value for the user. Note that all the preferences listed in
// the XML file will be present here even if the user has not set them (they will be the
// default values in that case).
var user = null;

// Authenticity token. Most of the time rails takes care of this for us, but if we need to
// do any submissions manually, you will need this.
var authenticityToken = null;

// Helios Units Hash, keyed by id.  Each object will contain {id, status, laser_status}
var heliosUnits = new Hash();

// Event map. The key is the event id and the value is the corresponding fotech.fibre.Event
// object.
var globalEventManager = new EventManager();

// SoundStream manager
var globalSoundStreamManager = new fotech.util.ObjectManager('soundStream');

// Alerts manager
var globalAlertManager = new fotech.util.ObjectManager('alert', { maxSize: 1000 } );

// The selected region of the map. This is a GLatLngBounds object.
var selectedRegionBounds = null;
var selectedDepthBounds = null;

// The unique id used when contacting the push daemon. If this is null then we cannot
// contact the push daemon.
var pushDaemonId = null;



// Set the view status message to be the line name of the current line. If the user also
// has permission to manage fibre lines the line id will also be shown.
function setViewStatusForFibre(fibreLine) {
    if (user.permissions['canManageFibreLines']) {
        setViewStatus(I18n.t("monitor.map.view_status", {fibre_name: fibreLine.name + ' (' + fibreLine.id + ')'}));
    }
    else {
        setViewStatus(I18n.t("monitor.map.view_status", {fibre_name: fibreLine.name}));
    }
};

// Given an event type id, return the event type object. This performs a linear search
// of the eventTypes array.
function getEventType(eventTypeId) {
    for (var i = 0; i < eventTypes.length; i++) {
        if (eventTypes[i].id == eventTypeId)
            return eventTypes[i];
    }
    return null;
}

// Given an event id return the event portion of a suitable title string.
function getEventTitle(eventId) {
    var ev = globalEventManager.getEvent(eventId);
    if (ev == null)
        return "event " + eventId;
    else
        return ev.getType().desc + " at " + ev.time.format("HH:MM:ss ") + ev.distance + "m";
}

function showEventTrackForEvent(eventId){
    popupTrackWindow(eventId);
}

function zoomToEvent(eventId){
    var ev = globalEventManager.getEvent(eventId);
    if(!ev)
        return;

    if(mainViewType == 'list' || displayedFibreLineIds.indexOf(ev.routeId) < 0){
        setMainFibreView(ev.routeId);
    }
    globalEventManager.zoomToEvent(eventId);
}

// Post an event and go to it's display.
function postEvent(eventId, fibreId) {
    readAndPostEvents("" + eventId, {manual_post:true});
    if (fibreId != displayedFibreLineId)
        setMainFibreView(fibreId);
    popupEventWindow(eventId);
}

// Post a number of events.
function postEvents(eventIdStr) {
    readAndPostEvents(eventIdStr, {manual_post:true});
}


