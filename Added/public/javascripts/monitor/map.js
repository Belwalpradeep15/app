/*
 * FILENAME:    map.js
 * AUTHOR:      Steven Klassen
 * CREATED ON:  2009-03-04
 * 
 * DESCRIPTION: Items specific to the map displays.
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

var jsmap = null;
var on_route_layer = null;
var fibre_region_layers = null;
var fibre_route_layer = null;
var events_layer = null;
var alerts_layer = null;
var helioses_layer = null;
var ref_points_layer = null;
var markers_layer = null;

// TODO:  these are clumsy as globals, better to centralize their uses
var event_connector_layer = null; // a layer for displaying a connector from a dialog to a location on the map
var alert_connector_layer = null; // a layer for displaying a connector from a dialog to a location on the map


function highlightFibreRoutes(map, latLngBnds)
{
    return map.getLayer(fotech.map.FibreRouteLayer.layer_name).selectWithin(latLngBnds, {"weight" : 10, "colour" : "#00FF00", "opacity" :0.45});
}

// Callback for when the user selects a region on the map.
function mapRegionSelected(map, latLngBnds) {
    // Determine if the selection includes any fibre lines and highlight them.
    if (!highlightFibreRoutes(map, latLngBnds)) {
        alert(I18n.t('monitor.helios.zone_list_dialog.no_intersecting_lines'));
        return false;
    }
    
    selectedRegionBounds = latLngBnds;
    if (jsfilter != null) {
        jsfilter.enable();
    }
    
    // Tell the search window to re-enable it's items if it exists.
    if (childWindows.isOpen('search')) {
        var wind = childWindows.get('search');
        wind.document.getElementById('results');
        wind.enable();
    }

    return true;
}

// Callback for when the user deselects the region on the map.
function mapRegionDeselected(map) {
    selectedRegionBounds = null;
    if (jsfilter != null) {
        jsfilter.enable();
    }
    fibre_route_layer.clearSelection();

    // Tell the search window to re-enable its items if it exists.
    if (childWindows.isOpen('search')) {
        var wind = childWindows.get('search');
        wind.document.getElementById('results');
        wind.enable();
    }
}

// Reset the map.
// TODO:  just a few things in here now, and I'm really not happy with them...
function resetMap() {
    resetDisplayHandlers();
    onClearEvents = mapDisplayOnClearEvents;
    onEventPopup = mapDisplayOnEventPopup;
    onEventPopupMove = function () {};
    onEventPopdown = mapDisplayOnEventPopdown;
}

// Initialize the map.
function initMap(useSelectRegion) {
    jsmap.render();
    globalEventManager.asArray().each(function(ev) {
        events_layer.addEvent(ev);
    });

    if (jsevent && jsevent.current_fibre_event)
        popupEventWindow(jsevent.current_fibre_event);
  
    if (useSelectRegion && fotech.map.Map.haveMapAPI)
        jsmap.addControl(new fotech.map.SelectRegionControl(mapRegionSelected, mapRegionDeselected),
                              'tl', 105, 7);

}


// Callback for clearing the events from the map.
function mapDisplayOnClearEvents() {
    if (events_layer != null)
        events_layer.clearEvents();
}

// Callback for an event popup.
function mapDisplayOnEventPopup(event) {
    event_connector_layer.setToLatLon(event._position);
}


// Callback for an event popdown.
function mapDisplayOnEventPopdown() {
    event_connector_layer.setToLatLon();
}
