/*
 * FILENAME:    mainDisplay.js
 * AUTHOR:      Steven Klassen
 * CREATED ON:  2009-02-25
 * 
 * DESCRIPTION: Javascript belonging to the main display that doesn't fit anywhere else.
 *              This file also defines the callbacks that the specific fibre displays can
 *              define in order to interact with the system.
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


var childWindows = new fotech.gui.ChildWindowManager(window);
var recent_events_dialog = null;
var multipleEventDialog = null;
var event_track_dialog = null;
var multiple_alerts_dialog = null;
var displayListeners = new Hash();

// The following "on" methods describe callbacks used to modify the behaviour of the fibre
// line displays. The default methods do nothing. Each display type (vertical, map, etc.)
// should provide versions of these appropriate to the handling of their displays.

// Clear events callback.  Note that at present we do not specify what events have been cleared.
var onClearEvents = function() {}

// Notify that the given event has just been displayed in the popup window.
var onEventPopup = function(event) {}

// Notify that the event popup has moved.
var onEventPopupMove = function() {}

// Notify that the event popup window has been closed. At present we do not specify
// what event was currently being displayed.
var onEventPopdown = function() {}

// Callback for when the main display has been resized.
var onMainResize = function() {}

// a place to add all the display listeners so we can keep a handle on them and
// remove them as necessary when we resetDisplayHandlers
function addDisplayDocumentListener(eventString, listener){
    if(!displayListeners.get(eventString))
        displayListeners.set(eventString, new Array());
    displayListeners.get(eventString).push(listener);
    document.observe(eventString, listener);
}

function releaseDisplayDocumentListeners(){
    displayListeners.each(_releaseListenersForEvent);
}
                          
function _releaseListenersForEvent(pair){
    var eventString = pair.key;
    var listeners = pair.value;
    listeners.each(function(l){document.stopObserving(eventString, l)});
}

// Reset the main display event handlers to their defaults. 
function resetDisplayHandlers() {
    onClearEvents = function() {};
    onEventPopup = function(event) {};
    onEventPopupMove = function() {};
    onEventPopdown = function() {};
    onMainResize = function() {};
    //release the event handlers
    releaseDisplayDocumentListeners();
}

// Callback used when the main display is loaded.
function mainDisplayOnLoad() {
    recent_events_dialog = new MultipleEventsDialog('recent_events_dialog');

    recent_events_dialog.setEventClickedCallback(popupEventWindow);
    recent_events_dialog.addDialogClosedCallback(function() { fotech.gui.getMenuItemById(jsmenubar, "showRecent").cfg.setProperty('checked', false); });
    
    //add event listeners
    var w = fotech.gui.rootOpener();
    Event.observe(w, 'eventManager:added', function(ev) {recent_events_dialog.addFibreEvent(ev.memo.event);});
    Event.observe(w, 'eventManager:filtering', function(){
                  recent_events_dialog.clearFibreEvents();
                  fotech.gui.rootOpener().globalEventManager.asArray().each(recent_events_dialog.addFibreEvent.bind(recent_events_dialog));
                  });
    Event.observe(w, 'eventManager:removed', function(ev) {recent_events_dialog.removeFibreEvent(ev.memo.event);});
    Event.observe(w, 'eventManager:cleared', function(ev) {recent_events_dialog.clearFibreEvents();});
    
    var dims = document.viewport.getDimensions();
    recent_events_dialog.show([], dims.width - 10, dims.height - 295, window);
   
    multipleEventDialog = new MultipleEventsDialog('multiple_events_dialog');
    multipleEventDialog.setEventClickedCallback(popupEventWindow);
    
    event_track_dialog = new MultipleEventsDialog('event_track_dialog');
    event_track_dialog.setEventClickedCallback(popupEventWindow);
    event_track_dialog.addDialogClosedCallback(_popdownTrackWindow);
    
    multiple_alerts_dialog = new MultipleAlertsDialog('multiple_alerts_dialog');
    multiple_alerts_dialog.addDialogClosedCallback(function() { fotech.gui.getMenuItemById(jsmenubar, "showAlertList").cfg.setProperty('checked', false); });

    //this will check every second if there are events to clear
    new PeriodicalExecuter( globalEventManager.timedClearEventsBasedOnType.bind(globalEventManager), 5);
}

// Callback used when the main display is unloaded.
function mainDisplayOnUnload() {
    if (jsmap != null)
        jsmap.unload();
    childWindows.forEach(function(key, wind) { wind.close(); });
}

// Callback used when the main display is resized.
function mainDisplayOnResize() {
    if (recent_events_dialog)
        fotech.gui.moveBackIntoWindow(recent_events_dialog.dialog);
    if(multipleEventDialog)
        fotech.gui.moveBackIntoWindow(multipleEventDialog.dialog);
    if(event_track_dialog)
        fotech.gui.moveBackIntoWindow(event_track_dialog.dialog);
    if(multiple_alerts_dialog)
        fotech.gui.moveBackIntoWindow(multiple_alerts_dialog.dialog);
    if (jsevent) {
        fotech.gui.moveBackIntoWindow(jsevent.dialog);
        if (jsevent.eventId)
            popupEventWindow(jsevent.eventId);  // Force recalling of callbacks.
    }
    fotech.gui.moveBackIntoWindow(jsfilter);
    onMainResize();
}

