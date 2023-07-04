/*
 * FILENAME:    events.js
 * AUTHOR:      Steven Klassen
 * CREATED ON:  2009-02-26
 *
 * DESCRIPTION: Javascript related to the general handling of events.
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


// Add an event to the system.
function addEvent(event) {
    if (!globalEventManager.exists(event)) {
        globalEventManager.addEvent(event);
        if (typeof(jsmenubar) != 'undefined')
            fotech.gui.enableMenuItem(jsmenubar, 'clearEvents', true);
    }
}

// Clear the events from the system.
function clearEvents() {
    globalEventManager.clearEvents();
    onClearEvents();
    fotech.gui.enableMenuItem(jsmenubar, 'clearEvents', false);
    if (jsevent != null) {
        jsevent.hide();
        jsevent.event = null;
        jsevent.current_fibre_event = null;
    }
    multipleEventDialog.dialog.hide();
}

var jsevent = null;
// Popup a window for the given event id.
// This method takes either an Event object or an event id
function popupEventWindow(event) {
    var eventType = typeof event;
    if (eventType == 'string' || eventType == 'number') {
      event = globalEventManager.getEvent(event);

      if (event == null) {
          alert("Could not find an event for id " + eventId + ".");
          return;
      }
    }

    _createAndPopupEventWindow(event);
    // TODO:  look into whether we can just make sure that we have a latlon member of the event
    event_connector_layer.setToLatLon(event._position );
    onEventPopup(event);
    jsevent.event = event.id;
}

// Popdown the event window. This method should be considered as private to this file.
function _popdownEventWindow() {
    var currentEvent = globalEventManager.getEvent(jsevent.event);
    if (currentEvent)
        globalEventManager.unlockEvent(currentEvent);
    onEventPopdown();
    jsevent.eventId = null;
}

// The event window has moved. This method should be considered private.
function _onMoveEventWindow() {
    onEventPopupMove();
}

// Create the event window if necessary and display it. This method should be considered as
// private to this file.
function _createAndPopupEventWindow(ev) {
    // Construct the popup window if it does not already exist.
    var dom = new fotech.dom.Dom(document);
    if (jsevent == null) {
        jsevent = new EventDialog('event_popup');
        jsevent.dialog.hideEvent.subscribe(_popdownEventWindow);
        jsevent.dialog.hideEvent.subscribe(popdownTrackWindow);
        jsevent.dialog.dragEvent.subscribe(_onMoveEventWindow);
        jsevent.dialog.moveTo(100, 85);
    }
    if(jsevent.current_fibre_event){  //if this current window has an event, unlock it
        var currEvent = globalEventManager.getEvent(jsevent.event)
        globalEventManager.unlockEvent(currEvent);
        if(event_track_dialog && event_track_dialog.eventTrackId != ev.eventTrackId)
                popdownTrackWindow();
    }

    if(!globalEventManager.exists(ev))
        addEvent(ev);

    globalEventManager.lockEvent(ev);
    jsevent.show(ev);
    fotech.gui.moveBackIntoWindow(jsevent.dialog);
    event_connector_layer.setFromDialog(jsevent);
}

function popupTrackWindow(event){
    var eventType = typeof event;
    if (eventType == 'string' || eventType == 'number') {
        event = globalEventManager.getEvent(event);

        if (event == null) {
            alert("Could not find an event for id " + eventId + ".");
            return;
        }
    }
    _createAndPopupTrackWindow(event, 100);
}

function _createAndPopupTrackWindow(ev, limit){
    var dom = new fotech.dom.Dom(document);
    if (event_track_dialog == null){
        event_track_dialog = new MultipleEventsDialog('event_track_dialog');
        event_track_dialog.dialog.moveTo(2000, 300);
    }
    event_track_dialog.eventTrackId = ev.eventTrackId;  //give the event_track_dialog some memory of track
    new Ajax.Request(prefixOrPortal('/monitor')+'/events/get_track_events?eventTrackId='+ev.eventTrackId,
                    { asynchronous:false,
                        evalScripts:true,
                        parameters: {limit: limit},
                        method:'get'});
}

function popdownTrackWindow(){
    if(!event_track_dialog)
        return;
    event_track_dialog.dialog.hide();
    _popdownTrackWindow();
}

function _popdownTrackWindow(){
    //get rid of highlight
    Event.fire(fotech.gui.rootOpener(), 'eventTracks:highlight', {events:[]});
}

var jsfibrecoords = null;
function showFibreCoordsDialog() {
    _createFibreCoordsDialog();
    jsfibrecoords.show();
}

// Show the event filter dialog.
var jsfilter = null;
function showFilterDialog() {
    if (!jsfilter) {
        alert(I18n.t("monitor.events.event_filter_dialog.not_loaded"));
        return;
    }

    jsfilter.enable();
    jsfilter.show();
}

// Cancel the filter. This method should be considered as private to this file.
function _handleFilterCancel() {
    jsfilter.cancel();
    jsfilter.restoreState();
}

function _handleFibreCoordsSubmit() {
  jsfibrecoords.submit();
}

// Apply the filter. This method should be considered as private to this file.
function _handleFilterSubmit() {
    if (jsfilter.validate()) {
        jsfilter._filtering = true;
        magnitudeFilterOnSubmit(jsfilter.form);
        onRouteFilterOnSubmit(jsfilter.form);
        globalEventManager.setFilterFunction(eventPassesFilters);
        var dom = new fotech.dom.Dom(document);
        var stopBut = new Element("a", { href: "javascript: stopEventFilter()", style: "padding-left: 10px;" }).update(I18n.t('common.status_message.clear_filter'));
        setStatusMessage(I18n.t('common.status_message.filter_on'), stopBut);
        fotech.gui.enableMenuItem(jsmenubar, 'clearEventFilter', true);
        jsfilter.storeState();
    }
}

// Stop the event filtering.
function stopEventFilter() {
    setStatusMessage(null, null);
    fotech.gui.enableMenuItem(jsmenubar, 'clearEventFilter', false);
    if (jsfilter != null) {
        jsfilter._filtering = false;
        globalEventManager.clearFilterFunction();
        jsfilter.clearState();
        jsfilter.cancel();
    }
}

// Returns true if the event passes the current filters and false otherwise.
function eventPassesFilters(ev) {
    if (!jsfilter || !jsfilter._filtering)          // If there are no filters, everything passes.
        return true;

    var form = $('filter_form');
    if (form.restrictToCurrentFibreLine.checked && (ev.routeId != displayedFibreLineId))
        return false;

    if (form.restrictToSpatialFilter.checked) {
        if (selectedRegionBounds) {
            var latlng = new LatLon(ev.latitude, ev.longitude);
            if (!selectedRegionBounds.contains([latlng]))
                return false;
        }
    }

    if (form.restrictEventTypes.checked) {
        if (!fotech.gui.isSelectedOption(form.eventTypes, ev.typeId))
            return false;
    }

    if (form.restrictMagnitude.checked) {
        if (form.minMagnitude.value != "" && ev.magnitude < parseFloat(form.minMagnitude.value))
            return false;
        if (form.maxMagnitude.value != "" && ev.magnitude > parseFloat(form.maxMagnitude.value))
            return false;
        if (form.minWidth.value != "" && ev.width < parseFloat(form.minWidth.value))
            return false;
        if (form.maxWidth.value != "" && ev.width > parseFloat(form.maxWidth.value))
            return false;
        if (form.minVelocity.value != "" && ev.velocity < parseFloat(form.minVelocity.value))
            return false;
        if (form.maxVelocity.value != "" && ev.velocity > parseFloat(form.maxVelocity.value))
            return false;
        if (form.minAcceleration.value != "" && ev.acceleration < parseFloat(form.minAcceleration.value))
            return false;
        if (form.maxAcceleration.value != "" && ev.acceleration > parseFloat(form.maxAcceleration.value))
            return false;
    }

    return true;        // Passed all the filters that were set.
}

// Create the event filter dialog if necessary. This method should be considered
// as private to this file.
function createEventFilterDialog() {
    if (jsfilter == null) {
        var cfg = {
        visible: false,
        constraintoviewport: true,
        postmethod: "manual",
        buttons: [ { text: fotech.gui.labels.dismiss, handler: _handleFilterCancel },
                  { text: fotech.gui.labels.submit, handler: _handleFilterSubmit, isDefault: true } ]
        };
        jsfilter = new fotech.gui.ValidatingDialog('filter_dialog', cfg, 'filter_form');

        jsfilter.validateFields = function() {
            magnitudeFilterValidate(this);
            eventTypeFilterValidate(this);
            onROuteFilterValidate(this);
        }

        jsfilter.enable = function() {
            _initFilterDialogState(document.getElementById('filter_form'));
        }
        jsfilter.currentLineId =  -1;
        jsfilter._filtering = false;

        jsfilter.render(document.body);
        if(typeof overlayManager != 'undefined')
            overlayManager.register(jsfilter);
    }
}

function _createFibreCoordsDialog() {
  if (jsfibrecoords == null) {
    var config = {
      visible: true,
      constraintoviewport: true,
      hideaftersubmit: false,
      buttons: [ {text: I18n.t('common.button.clear')},
                 {text: I18n.t('common.button.submit'), handler: function() {this.submit()}, isDefault: true}
               ]
    }

    jsfibrecoords = new FibreLineDialog("fibreCoordDialog", config, "fibreCoordsForm");

    jsfibrecoords.validateFields = function() {
    }

    jsfibrecoords.render(document.body);
  }
}

// Initialize the filter dialog with the current state of the system. This method should be
// considered as private to this file.
function _initFilterDialogState(form) {
    _enable('filterFormSpatialCheckbox', [form.restrictToSpatialFilter], (selectedRegionBounds != null || selectedDepthBounds != null));

    _enable('filterFormCurrentLineCheckbox', [form.restrictToCurrentFibreLine], (displayedFibreLineId != null));
    var line = null;
    if (displayedFibreLineId != null) {
        line = getFibreLineById(displayedFibreLineId);
        document.getElementById('filterFormFibreLineName').innerHTML = "(" + line.name + ")";
    }
    eventTypeFilterEnable(form);
    magnitudeFilterEnable(form);
    onRouteFilterEnable(form);
    if (jsfilter.currentLineId != displayedFibreLineId) {
        var count = 0;
        for (var i = 0; i < eventTypes.length; i++) {
            if (line == null || line.eventCategoryIds[eventTypes[i].eventCategoryId] == true)
                form.eventTypesList.options[count++] = new Option(eventTypes[i].description, eventTypes[i].id);
        }
        form.eventTypesList.options.length = count;
        jsfilter.currentLineId = displayedFibreLineId;
    }
}

// Enable/disable items. This method should be considered as private to this file.
function _enable(id, fields, flag) {
    if (id != null)
        jsfilter.enableItems([ id ] ,flag);
    if (fields != null)
        jsfilter.enableFields(fields, flag);
}

// Read events from the server and post them on the map.
function readAndPostEvents(eventIdsStr, options) {
    options = options || new Hash();
    manual_post = options['manual_post'] == true;
    new Ajax.Request(prefixOrPortal('/monitor')+'/events/post',//?ids=' + eventIdsStr + '&authenticity_token=' + encodeURIComponent(authenticityToken),
                     { asynchronous:false, evalScripts:true,
                     parameters: {authenticity_token:encodeURIComponent(authenticityToken), ids:eventIdsStr, manual_post:manual_post },
                        method: 'get' });
}
// Read events from the server and post them on the map.
function fetchEventsSince(time) {
    var timeString = time.format("xmlDateTime",true);
    new Ajax.Request(prefixOrPortal('/monitor')+'/events/fetch_events_since',
                     { evalScripts:true,
                     parameters: {time:timeString,authenticity_token:encodeURIComponent(authenticityToken)},
                        method: 'get' });
}

// Single location for all events in the system
//
// Since we can't guarantee order, we track the events in an array too.
//
EventManager = function() {
    this._MAX_EVENTS_TO_TRACK = 500;
    this._eventsHash = new Hash();
    this._eventsArray = new Array();
    this._lockedEvents = new Hash();  //if an event is locked we are not allowed to remove it from the list
    this._listenerHash = new Hash();
    this._filterFunction = null;
};

// This method first checks the number of events that it is tracking. If the
// number of events is greater or equal to MAX_EVENTS_TO_TRACK, it will
// shift out the oldest event and push in the new event to replace it.
//
// This will fire four custom events...
//  eventManager:added - when an event is added, and
//  eventManager:removed - when an event is removed
//  eventManager:cleared - when the entire manager is cleared
//  eventManager:zoomTo - just a way to notify everything that the user wants to zoom to an event
//  eventManager:filtering - set to let all components know that event filtering
//      has changed, and they should probably grab their interested events again
//
// To listen for these events, listen on the root opening window. Both events will contain
// the event object in the memo, tagged with 'event'.
//
EventManager.prototype.addEvent = function(evt) {
    var w = fotech.gui.rootOpener();

    //First check to see if an event exists with the incoming event track id
    //if so remove it.
    var _lockedEvents = this._lockedEvents;
    var removedEvents = [];
    if(evt.eventTrackId != null){
        partition = this._eventsArray.partition(function(e){
                                                    if (e == null) {
                                                        // Remove null event objects.
                                                        return true;
                                                    }
                                                    else {
                                                        // Remove events with the same track as our event.
                                                        var sameTrack = e.eventTrackId == evt.eventTrackId;
                                                        var locked = this._lockedEvents.keys().include(e.id);
                                                        return sameTrack && !locked;
                                                    }
                                                }, this);
        removedEvents = partition[0];
        this._eventsArray = partition[1];
    }

    if (this._eventsArray.length >= this._MAX_EVENTS_TO_TRACK) {
        var kill = this._eventsArray.find(function(e){return !this._lockedEvents.keys().include(e.id);}, this);
        this._eventsArray.splice(this._eventsArray.indexOf(kill), 1);
        this._eventsHash.unset(kill.id);
        removedEvents.push(kill);
    }
    evt._arrivedTime = new Date();
    this._eventsHash.set(evt.id, evt);
    this._eventsArray.push(evt);
    //Event.fire(w, 'eventManager:added', { event: evt });
    if(this._passesFilters(evt)){
        Event.fire(w.document, 'eventManager:added', { event: evt });
    }

    removedEvents.each(function(re){
                        if (re != null) {
                            this._eventsHash.unset(re.id);
                            Event.fire(w, 'eventManager:removed', { event:re });
                            Event.fire(w.document, 'eventManager:removed', { event:re });
                        }
                       }, this);

};

EventManager.prototype.getEvent = function(eventId) {
  event = this._eventsHash.get(parseInt(eventId, 10));
  if (event === undefined)
    event = null;
  return event;
};

// Checks if this event manager is tracking a given event or event id
EventManager.prototype.exists = function(event_or_event_id) {
  eventId = (typeof event_or_event_id == 'object') ? event_or_event_id.id : event_or_event_id;
  return this.getEvent(eventId) !== null;
};

/**
 * Clear all the events. This will also fire a 'eventManager:cleared' custom event.
 */
EventManager.prototype.clearEvents = function() {
    this._eventsHash = new Hash();
    this._eventsArray = new Array();
    Event.fire(fotech.gui.rootOpener(), 'eventManager:cleared', {});
    Event.fire(fotech.gui.rootOpener().document, 'eventManager:cleared', {});
};

/**
 * Clear all events that are older than n seconds. This will fire an 'eventManager:removed'
 * event for each fibre event that is cleared.
 */
EventManager.prototype.clearEventsOlderThan = function(n, exceptFor) {
    var ev;
    var w = fotech.gui.rootOpener();
    var cutoff = (new Date()).getTime() - (n * 1000);
    var len = this._eventsArray.length;
    for (var i = 0; i < len; ++i) {
        ev = this._eventsArray[i];
        if (ev && exceptFor && exceptFor[ev.id])
            continue;
        if (ev && ev._arrivedTime.getTime() < cutoff) {
            this._eventsArray[i] = null;
            Event.fire(w, 'eventManager:removed', { event: ev });
            Event.fire(w.document, 'eventManager:removed', { event: ev });
        }
    }
    this._eventsArray.compact();
}

EventManager.prototype.removeEventById = function(eventId) {
  var w = fotech.gui.rootOpener();
  var len = this._eventsArray.length;
  for (var i = 0; i < len; ++i) {
    var ev = this._eventsArray[i];
    if (ev.id == eventId) {
      this._eventsArray[i] = null;
        Event.fire(w, 'eventManager:removed', { event: ev });
        Event.fire(w.document, 'eventManager:removed', { event: ev });
      break;
    }
  }
  this._eventsArray.compact();
};



/**
 * Clear all events based on type hash
 *
 */
EventManager.prototype.timedClearEventsBasedOnType = function() {
    var ev;
    var w = fotech.gui.rootOpener();
    var nothingToClear = w.eventTypes.select(function(et){ return et.clearingInterval > 0;}).length == 0;
    if(nothingToClear)
        return;

    var len = this._eventsArray.length;
    for (var i = 0; i < len; ++i) {
        ev = this._eventsArray[i];
        if(this._lockedEvents.get(ev.id))
            continue;   //this event is locked do not remove it.
        if(ev.manual_post){
            continue;  //ignore events that have been posted manually
        }
        et = w.getEventType(ev.typeId);
        if(et.clearingInterval == 0) {
            continue;
        }
        cutoff = (new Date()).getTime() - (et.clearingInterval * 1000);
        if (ev && ev._arrivedTime.getTime() < cutoff) {
            this._eventsArray[i] = null;
            Event.fire(w, 'eventManager:removed', { event: ev });
            Event.fire(w.document, 'eventManager:removed', { event: ev });
        }
    }
    this._eventsArray = this._eventsArray.compact();
}

/**
 * Mark an event of interest.  This event will not be removed from
 * the EventManager list.  (typically used for events that are currently being
 * viewed from the event dialog)
 */
EventManager.prototype.lockEvent = function(event){
    if(!event) return;
    this._lockedEvents.set(event.id, event);
}

/**
 * Unset any ids of an event of interest.
 */
EventManager.prototype.unlockEvent = function(event){
    if(!event) return;
    this._lockedEvents.unset(event.id);
}

EventManager.prototype.asArray = function() {
    return this._eventsArray.findAll(this._passesFilters.bind(this));
};

EventManager.prototype.eventCount = function() {
  return this.asArray().length;
};

EventManager.prototype.contains = function(event) {
  return this.containsKey(event.id);
};

EventManager.prototype.containsKey = function(eventId) {
  return this._eventsHash.get(eventId) !== undefined;
};

EventManager.prototype.zoomToEvent = function(eventId){
    ev = this.getEvent(eventId);
    if(!ev)
        return;
    Event.fire(fotech.gui.rootOpener(), 'eventManager:zoomTo', { event: ev });
};

/**
 * EventManager, set filter function
 * this sets the function with which events will be validated against when
 * adding or updating.  It will allow the event to be added still but without
 * firing an 'added' event
 * if a user has a specific id it can still be retrieved if it does not pass filters
 * however, if a user requests all the events, it will only return those that
 * do pass the filters.  locked events are unaffected by filtering
 * Setting or unsetting the filter function will trigger a "filtering" event so
 * that components know they should grab events again
 */
EventManager.prototype.setFilterFunction = function(filter){
    this._filterFunction = filter;
    Event.fire(fotech.gui.rootOpener(), 'eventManager:filtering');
    Event.fire(fotech.gui.rootOpener().document, 'eventManager:filtering');
}

EventManager.prototype.clearFilterFunction = function(){
    this.setFilterFunction(null);
}

EventManager.prototype._passesFilters = function(event){
    if(this._filterFunction == null || this._lockedEvents.get(event.id) !== undefined)
        return true;
    return this._filterFunction(event)
}

/*
 * EventManager Observing code - this code mimics the Event.observe code of
 * prototype so that the user can just say they want to observe the event manager
 * rather than listening to the root document
 */
EventManager.prototype.observe = function(eventString, callback){
    //figure out the eventString
    var eventStr = eventString;
    var wrappedCallback = function(ev){
        try{
            callback(ev);
        } catch (ex){
            //Exception hit, write it to console and remove this callback
            if(console)
                console.log("This listener will be removed.  Exception message: " + ex.message);
            fotech.gui.rootOpener().document.stopObserving(eventStr, arguments.callee);
        }
    }
    this.__addListener(eventStr, callback, wrappedCallback);
}

EventManager.prototype.__addListener = function(eventString, callback, wrappedCallback){
    if(this._listenerHash.get(eventString) == null)
        this._listenerHash.set(eventString, new Array());
    this._listenerHash.get(eventString).push([callback, wrappedCallback]);
    fotech.gui.rootOpener().document.observe(eventString, wrappedCallback);
}

EventManager.prototype.__removeListener = function(eventString, callback){
    this._listenerHash.each(function(pair){
                            var aEventString = pair[0];
                            var listenerList = pair[1].reverse();

                            if(typeof(eventString) == 'string' && aEventString != eventString)
                            return;

                            var i = 0;
                            listenerList.each(function(callbackPair){
                                              var aCallback = callbackPair[0];
                                              var aWrappedCallback = callbackPair[1];

                                              if(typeof(callback) == 'function' && aCallback != callback)
                                              return;

                                              fotech.gui.rootOpener().document.stopObserving(aEventString, aWrappedCallback);
                                              var index = listenerList.length - 1 - i;
                                              var slice = this._listenerHash.get(aEventString).slice(index ,1);
                                              this._listenerHash.set(aEventString, slice);
                                              i++;
                                              }, this);

                            }, this);

}



/**
 * Method meant to mimic the stop observing prototype method
 * @param eventString {String} Optional. The event string to stop observing, if not provided all events will be removed
 * @param callback {Function} Optional.  The exact callback to unwire, if not provided all events attached to the eventString will be removed
 */
EventManager.prototype.stopObserving = function(eventString, callback){
    //figure out the eventString
    this.__removeListener(eventString, callback);
}
