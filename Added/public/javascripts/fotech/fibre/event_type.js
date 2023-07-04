/*
 * FILENAME:    event_type.js
 * AUTHOR:      Karina Simard
 * CREATED ON:  10-05-05
 * 
 * DESCRIPTION:  js class that encapsulates the event types
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

/**
 * @fileoverview ...add brief description of the file...
 */
 
/** Fotech namespace. */
var fotech = (fotech ? fotech : {});

/** Fotech map namespace. */
fotech.fibre = (fotech.fibre ? fotech.fibre : {});

/**
 * Construct an event type. Note that this also registers the type in a global event types
 * object which makes it available by the Event.getType method.
 *
 * @constructor
 * @param id the type id.
 * @param name the type name.
 * @param desc the type description.
 * @param image_file "relative" path to the event image
 *
 * @class
 * The event type class describes a single type of event.
 */
fotech.fibre.EventType = function(id, name, desc, image_file) {
    this.id = id;
    this.name = name;
    this.desc = desc;
    this.image_file = image_file || (name + ".png");
    
    this.imageURL = "/images/fotech/fibre/event_markers/" + this.image_file;
    this.smallImageURL = "/images/fotech/fibre/small_event_markers/" + this.image_file;
    this.largeImageURL = "/images/fotech/fibre/large_event_markers/" + this.image_file;

    this._icon = null;
    this.image = new Image();
    this.image.src = this.imageURL;
    
    fotech.fibre.EventType._eventTypesById[id] = this;
    fotech.fibre.EventType._eventTypesByName[name] = this;
}

/**
 * Get the event type icon, creating it if it has not already been done. 
 * @return a GIcon object.
 */
fotech.fibre.EventType.prototype.getIcon = function() {
    if (this._icon == null)
        this._icon = fotech.fibre.EventType._createEventIcon(this);
    return this._icon;
}

/**
 * Get the event type by id.
 * @param id the event type id you are looking for.
 * @return the event type or null if it does not exist.
 */
fotech.fibre.EventType.getEventTypeById = function(id) {
    return fotech.fibre.EventType._eventTypesById[id];
}

/**
 * Get the event type by name.
 * @param name the event name you are looking for.
 * @return the event type or null if it does not exist.
 */
fotech.fibre.EventType.getEventTypeByName = function(name) {
    return fotech.fibre.EventType._eventTypesByName[name];
}


// Create an event icon.
fotech.fibre.EventType._createEventIcon = function(etype) {
    var icon = null;
    if (typeof(GIcon) != 'undefined') {
        icon = new GIcon(null, etype.imageURL);
        icon.iconSize = new GSize(16, 28);
        icon.iconAnchor = new GPoint(6, 28);
        icon.infoWindowAnchor = new GPoint(8, 2);
    }
    return icon;
}

// Map of possible event types.
fotech.fibre.EventType._eventTypesById = {};
fotech.fibre.EventType._eventTypesByName = {};
new fotech.fibre.EventType(1, "unknown", "Unknown Event");

