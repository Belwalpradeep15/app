/**
 * Created by arunas on 28/09/16.
 */

/** Fotech namespace. */
var fotech = (fotech ? fotech : {});

/** Fotech map namespace. */
fotech.map = (fotech.map ? fotech.map : {});

///////////////////////////////////////////////////////////
//
//  fotech.map.EventsLayer
//
//  - handles drawing and manipulating Event/Alert markers on a map
//  TODO:  it would be nice to sort out the name space collisions.  Event, vs event etc
//         it's hard to tell a js event from a helios event from a prototype event.
//         can't use 'alert' as a variable name without running into the js alert function...

fotech.map.EventsLayer = function (map, eventManager, fibreRoutes) {
    fotech.map.layer.call(this, fotech.map.EventsLayer.layer_name, map);

    this._events = {};
    this.setBounds();  // sets no bounds
    this.fibreRoutes = fibreRoutes;

    this._setEventHandlers(eventManager);
    this.onGetTTHandler = this.getToolTipMessage.bind(this);
    this.onClickHandler = this.onClick.bind(this);
};

fotech.map.EventsLayer.prototype = Object.create(fotech.map.layer.prototype);
fotech.map.EventsLayer.prototype.constructor = fotech.map.EventsLayer;

fotech.map.EventsLayer.layer_name = "events_layer";

fotech.map.EventsLayer.prototype.mapEventId = function (id) {
    return "event:" + id;
}

fotech.map.EventsLayer.prototype.unload = function () {
    // TODO:  well.  This just looks awkward - is there a better way to call the parent class?
    Object.getPrototypeOf(Object.getPrototypeOf(this)).unload.bind(this)();
    this._unsetEventHandlers();
};

fotech.map.EventsLayer.prototype.addEvent = function (event) {

    event._position = this.resolveCoordinates(event, this.map.map_type)

    this.addOrUpdateMarker(this.mapEventId(event.id), "", event._position, event.getType().imageURL,
        { className: 'event' },
        {
            "tt_provider": this.onGetTTHandler,
            "onClick": this.onClickHandler
        }, {"event": event});

    this._events[event.id] = event;
    this.updateBounds(event._position);

};

/**
 * Remove an event from the layer.
 */
fotech.map.EventsLayer.prototype.removeEvent = function (ev) {
    var event = this._events[ev.id];
    if (typeof event != "undefined" && event) {
        this.removeMarker(this.mapEventId(event.id));
        delete this._events[ev.id];
    }
};

/**
 * Rezoom and recenter the map to show a specific event.
 * @param eventId the event to display.
 * @throws Error if the event is not in the map.
 */
fotech.map.EventsLayer.prototype.zoomToEvent = function (eventId) {
    var event = this._events[eventId];
    if (event == null)
        throw new Error("Could not find the event for id " + eventId + ".");
    this.map.saveContextAndZoom(event._position, 18);
};

/**
 * getToolTipMessage
 * @param name - the name of the event to describe
 * @returns {string}
 */
fotech.map.EventsLayer.prototype.getToolTipMessage =
    function (overlay) {
        return I18n.t('event.tooltip', {name: overlay.extra.event.getType().desc});
    };

/**
 * react to a mouse click
 * @param event - event that's been clicked
 * @param lat_long - the click location
 */
fotech.map.EventsLayer.prototype.onClick = function (overlay, lat_long) {
    var event = overlay.extra.event;
    Event.fire(document, 'fotechmap:eventclicked', event);
    if (event != null) {
        var point = this.map.getPixelFromPosition(lat_long);
        var bounds = new fotech.geom.gis.Bounds([
            this.map.getPositionFromPixel({x: point.x - 5, y: point.y - 5}),
            this.map.getPositionFromPixel({x: point.x + 5, y: point.y + 5})]);
        var events = this._getEventsWithinBounds(bounds);
        // TODO:  these are just too direct, would be better to be a little less tightly coupled here
        if (events.length > 1)
            multipleEventDialog.show(events, point.x, point.y, this.mapId);
        else {
            popupEventWindow(event);
        }
    }
};

// Return an array of all the events that are near (5 pixel radius) a given point.
// TODO: this is almost duplicated by selectWithin() below...
fotech.map.EventsLayer.prototype._getEventsWithinBounds = function (bounds) {
    var evts = [];
    var ev;
    for (var id in this._events) {
        if (this._events.hasOwnProperty(id)) {
            ev = this._events[id];
            if (bounds.contains([ev._position]))
                evts[evts.length] = ev;
        }
    }
    return evts;
};

/**
 * Clear all events currently on the layer.
 */
fotech.map.EventsLayer.prototype.clearEvents = function () {
    this.removeAllMarkers();
    this._events = {};
    this.setBounds();  // sets no bounds
};

fotech.map.EventsLayer.prototype.addEvents = function (events) {
    for (var i = 0; i < events.length; i++) {
        this.addEvent(events[i]);
    }
};

fotech.map.EventsLayer.prototype._addEventHandler = function (ev) {
    this.addEvent(ev.memo.event);
};

fotech.map.EventsLayer.prototype._updateAllEventsHandler = function (ev) {
    this.clearEvents();
    this.addEvents(this._eventManager.asArray());
};

fotech.map.EventsLayer.prototype._removedEventHandler = function (ev) {
    this.removeEvent(ev.memo.event);
};

fotech.map.EventsLayer.prototype._zoomToEventHandler = function (ev) {
    this.zoomToEvent(ev.memo.event.id);
};

fotech.map.EventsLayer.prototype._setEventHandlers = function (eventManager) {
    this._eventManager = eventManager;
    var w = fotech.gui.rootOpener();

    this._addEventHandlerWrapper = this._addEventHandler.bind(this);
    this._updateAllEventsHandlerWrapper = this._updateAllEventsHandler.bind(this);
    this._clearEventsWrapper = this.clearEvents.bind(this);
    this._removedEventHandlerWrapper = this._removedEventHandler.bind(this);
    this._zoomToEventHandlerWrapper = this._zoomToEventHandler.bind(this);
    Event.observe(w, 'eventManager:added', this._addEventHandlerWrapper);
    Event.observe(w, 'eventManager:filtering', this._updateAllEventsHandlerWrapper);
    Event.observe(w, 'eventManager:cleared', this._clearEventsWrapper);
    Event.observe(w, 'eventManager:removed', this._removedEventHandlerWrapper);
    Event.observe(w, 'eventManager:zoomTo', this._zoomToEventHandlerWrapper);
};

fotech.map.EventsLayer.prototype._unsetEventHandlers = function () {
    var w = fotech.gui.rootOpener();

    Event.stopObserving(w, 'eventManager:added', this._addEventHandlerWrapper);
    Event.stopObserving(w, 'eventManager:filtering', this._updateAllEventsHandlerWrapper);
    Event.stopObserving(w, 'eventManager:cleared', this._clearEventsWrapper);
    Event.stopObserving(w, 'eventManager:removed', this._removedEventHandlerWrapper);
    Event.stopObserving(w, 'eventManager:zoomTo', this._zoomToEventHandlerWrapper);
};

/**
 * TODO:  this probably doesn't get used much, and it's duplicated - refactoring op!
 * Selects and returns all event within the bounds
 * @param boundsList - a list of fotech.geom.gis.Bounds....I think
 */
fotech.map.EventsLayer.prototype.selectWithin = function (boundsList) {
    var events = [];

    boundsList = [boundsList].flatten();

    for (var b_idx in boundsList) {
        if (boundsList.hasOwnProperty(b_idx)) {
            var b = boundsList[b_idx];
            for (var id in this._events) {
                if (this._events.hasOwnProperty(id)) {
                    var event = this._events[id];

                    if (d.contains(event._position)) {
                        events[id] = event;
                    }
                }
            }
        }
    }

    return events;
};



fotech.map.EventsLayer.prototype.resolveCoordinates = function(incident, map_type){
    var result = null;

    if (map_type == 'engineering') {
        if (incident) {
            var route = this.fibreRoutes[incident.routeId];
            if( route ){
                result = route.latLngFromFibrePosition(parseFloat(incident.distance));
            }
            if (!result) {
                result = route.lastFibreVertex();
                setStatusMessage(I18n.t('common.status_message.out_of_calibrated_range',
                            {
                                name: incident.getType().desc,
                                fibre_name: route.name
                            }));
                }
        }
    }else{
        if (incident && incident.latitude && incident.longitude) {
            result = new LatLon(incident.latitude, incident.longitude);
        }
    }

    return result;
}