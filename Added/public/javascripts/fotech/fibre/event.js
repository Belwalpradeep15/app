/*
 * FILENAME:    event.js
 * AUTHOR:      Steven Klassen
 * CREATED ON:  2008-10-02
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
 * This file is Copyright (c) 2008 Fotech Solutions Ltd. All rights reserved.
 */

/**
 * @fileoverview Items related to an event as displayed on a map.
 */

/** Fotech namespace. */
var fotech = (fotech ? fotech : {});

/** Fotech map namespace. */
fotech.fibre = (fotech.fibre ? fotech.fibre : {});


/**
 * Construct an event from an XML description.
 * @constructor
 * @param xml An XML Event element as described in types-0.1.xsd.
 */
fotech.fibre.Event = function(xml) {
    if (xml) {
        this.id = xml.getAttribute("event-id");
        this.routeId = xml.getElementsByTagName("Source")[0].getAttribute("fibre-line-id");
        this.time = Date.parseXMLDateTime(xml.getTextByTagName("Time"));
        this.magnitude = xml.getTextByTagName("Magnitude");
        this.distance = xml.getTextByTagName("DistanceOnLine");

        var typeEl = xml.getElementsByTagName("EventType")[0];
        this.typeId = typeEl.getAttribute("type-id");
        this.confidence = typeEl.getAttribute("confidence");

        this.latitude = xml.getTextByTagName("Latitude");
        this.longitude = xml.getTextByTagName("Longitude");

    }
}

/**
 * Create an event from a JSON description. Note that we need the ability to handle
 * both the current and older versions of the JSON string.
 */
fotech.fibre.Event.createFromJSON = function(json) {
    var ev = new fotech.fibre.Event();
    ev.id = (json["event_id"] ? json["event_id"] : (json["id"] ? json["id"] : null));
//    ev.id = (json.id == 0 ? null : json.id);
    ev.routeId = json.fibre_line_id;
    ev.time = Date.parseXMLDateTime(json.time);
    ev.magnitude = json.amplitude;
    ev.distance = json.position;
    ev.width = json.width;
    ev.velocity = json.velocity;
    ev.acceleration = json.acceleration;
    ev.confidence = json.confidence;
    ev.latitude = json.latitude;
    ev.longitude = json.longitude;
    ev.tags = (json["tags"] ? json["tags"] : (json["event_tags"] ? json["event_tags"] : null));
//    ev.tags = json.event_tags
    ev.eventTrackId = null;
    if (json.event_track_id)
        ev.eventTrackId = json.event_track_id
    if (json.event_type_id)
        ev.typeId = json.event_type_id;
    else {
        var et = fotech.fibre.EventType.getEventTypeByName(json.event_type);
        if (!et)
            et = fotech.fibre.EventType.getEventTypeByName("unknown");
        if (!et)
            throw "Could not determine a suitable event type.";
        ev.typeId = et.id;
    }
    return ev;
}

/**
 * Return the type of the event.
 * @return the event type.
 */
fotech.fibre.Event.prototype.getType = function() {
    var t = fotech.fibre.EventType._eventTypesById[this.typeId];
    if (t == null)
        t = fotech.fibre.EventType._eventTypesById[1];
    return t;
}

fotech.fibre.Event.prototype.tagInfoString = function(options){
    options = options || {}
    if(this.tags == null)
        return "";

    //set up default option values
    var joinString = options.join || "<br />"

    var str = "";
    for(var i = 0; i < this.tags.length; i++){
        if (this.tags[i].visible)
            str += this.translateTag(this.tags[i], options) + joinString;
    }
    return str;
}

fotech.fibre.Event.prototype.translateTag = function(tag, options){
    var includeLabel = options.includeLabel == null ? true : options.includeLabel;
    var preferences = options.preferences || {};

    var string = ""
    if(includeLabel)
        string += I18n.t("event.tag." + tag.key) + ": ";

    var value = tag.value;
    if(tag.units != null){
        value = fotech.util.lazyConvert(value, tag.units, preferences);
    }
    string += value;

    return string;
}

fotech.fibre.Event.prototype.getTag = function(key){
    if(this.tags == null)
        return null;
    for(var i = 0; i < this.tags.length; i++){
        if(this.tags[i].key == key)
            return this.tags[i].value;
    }
    return null;
}
