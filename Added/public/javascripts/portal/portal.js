/*
 * FILENAME:    portal.js
 * AUTHOR:      Steven Klassen
 * CREATED ON:  2010-02-25
 *
 * DESCRIPTION: Javascript common to the portal sub-application.
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

/** Portal namespace. */
var portal = (portal ? portal : {});

var event_track_dialog = null;  //placeholder
var childWindows = new fotech.gui.ChildWindowManager(window);

portal.onUnload = function() {
  childWindows.forEach(function(key, wind) {wind.close();});
};

// When the window first loads we must perform the layout.
portal.onLoad = function(eventClearingInterval, browserRefreshInterval) {
    // Construct the window layout.
//    var fibreViewHeight = Math.ceil(document.viewport.getHeight() * 0.75);
    var fibreViewHeight = document.viewport.getHeight() - 30;
    var layout = new YAHOO.widget.Layout({
                                         units: [ { position: 'top', body: 'fibre', height: fibreViewHeight + 'px', resize: false },
                                                 { position: 'bottom', body: 'footer', height: '30px' },
                                                 { position: 'center', body: 'soundfield', scroll: false }]});
    layout.render();

    // Obtain the fibre line and init its display.
    var fibre = getFibreLineById(displayedFibreLineId);
    if (fibre) {
        switch (fibre.displayTypeName) {
            default:
            case "map":
                initMapState();
                break;
            case "section":
                portal.sectionDisplay = initSectionViewState();
                jsmap = portal.sectionDisplay; // nasty global that unfortunately is used everywhere
                if (typeof(postInitSectionView) == "function")
                    postInitSectionView(portal.sectionDisplay);
                break;
        }
    }

    // Setup the event clearing timer.
    var self = this;
    Event.observe(fotech.gui.rootOpener(), 'eventManager:removed', function(ev) { self.removeEvent(ev.memo.event); });
    Event.observe(fotech.gui.rootOpener(), 'eventManager:added', function(ev) { self.addEvent(ev.memo.event); });
    Event.observe(fotech.gui.rootOpener(), 'eventManager:cleared', onClearEvents);
    if (eventClearingInterval > 0) {
        new PeriodicalExecuter(function(pe) { portal._periodicRemoval(eventClearingInterval); }, 5);
    }

    if (browserRefreshInterval > 0) {
        new PeriodicalExecuter(function(pe) { portal._periodicRefresh(); }, browserRefreshInterval);
    }
}

portal._periodicRefresh = function(){
    fotech.gui.FotechDialog.setBusyState('yui-gen3', undefined, I18n.t('common.dialog.refreshing'));
    location.reload(true);
}

// Periodic removal functions.
var __currentEvent = null;

portal._periodicRemoval = function(eventClearingInterval) {
    var exceptFor = null;
    if (__currentEvent) {
        exceptFor = {};
        exceptFor[__currentEvent.id] = true;
    }
    globalEventManager.clearEventsOlderThan(eventClearingInterval, exceptFor);
}

// Clear an event from the system.
portal.removeEvent = function(ev) {
    if (__currentEvent && __currentEvent.id == ev.id) {
        if (jsevent) {
            jsevent.hide();
            __currentEvent = null;
        }
    }
    if (recent_events_dialog)
        recent_events_dialog.removeFibreEvent(ev);
    if (multipleEventDialog)
        multipleEventDialog.removeFibreEvent(ev);
}

portal.addEvent = function(ev){
    if(recent_events_dialog)
        recent_events_dialog.addFibreEvent(ev);
}

// We provide a resetMap method that leaves out the monitor-specific items found in map.js.
var jsmap = null;
function resetMap() {
    if (jsmap != null) {
        jsmap.unload();
    }
    jsmap = new fotech.map.Map('map', fotech.map.Map.mapProvider, user.preferences);

}


// Get a GPoint for the event window. This method should be considered private.
function __mapGetPopupPosition() {
    var popup = document.getElementById('event_popup');
    var map = document.getElementById('map');
    var x = (fotech.gui.getX(popup) - fotech.gui.getX(map)) + (popup.offsetWidth / 2);
    var y = (fotech.gui.getY(popup) - fotech.gui.getY(map)) + (popup.offsetHeight / 2);
    return jsmap.gmap.fromContainerPixelToLatLng(new GPoint(x, y));
}

// Callback for an event popup.
function onEventPopup(event) {
    __currentEvent = event;
    event_connector_layer.setFromDialog(jsevent);
    event_connector_layer.setToLatLon(event._position);

    if (portal.sectionDisplay)
        portal.sectionDisplay.handleEventPopup(event);
}

// Callback for when the event popup is moved.
function onEventPopupMove() {
    if (portal.sectionDisplay)
        portal.sectionDisplay.render();
}

// Callback for an event popdown.
function onEventPopdown() {
    if (portal.sectionDisplay)
        portal.sectionDisplay.handleEventPopup(null);

    event_connector_layer.setToLatLon();

    if (__currentEvent)
        __currentEvent = null;
}

// We provide an initMap that leaves out the monitor-specific items found in map.js.
// TODO:  Scary, this doesn't get called...
// function initMap(useSelectRegion, useDrawPolygon) {
//     jsmap.render();
//     if (fotech.map.Map.haveMapAPI && fotech.map.Map.mapProvider == 'google') {
//         GEvent.addListener(jsmap.gmap, "move", mapDrawEventLink);
//         jsmap.gmap.setMapType(G_HYBRID_MAP);
//     }
// }

// We provide a trimmed down version of setViewStatusForFibre.
function setViewStatusForFibre(fibreLine) {
    alert("I got called");
    setViewStatus('Fibre line: ' + fibreLine.name);
}

// Clear all the events.
function onClearEvents() {
    if (jsmap != null)
        jsmap.clearEvents();
    if (__currentEvent) {
        if (jsevent) {
            jsevent.hide();
            __currentEvent = null;
        }
    }
    if (recent_events_dialog)
        recent_events_dialog.clearFibreEvents();
    if (multipleEventDialog)
        multipleEventDialog.clearFibreEvents();
}

// Show the recent events dialog.
var recent_events_dialog = null;
function showRecentEvents() {
    if (!recent_events_dialog) {
        recent_events_dialog = new MultipleEventsDialog('recent_events_dialog', 'active_alerts');
        recent_events_dialog.setEventClickedCallback(popupEventWindow);

        recent_events_dialog.show([]);
    }
    recent_events_dialog.dialog.show();
}

function showLegend() {
    if (typeof legend_dialog == 'undefined' || !legend_dialog){
        if($('legend')){
            legend_dialog = new YAHOO.widget.Panel("legend", { visible: true, draggable: false, close: false});
            legend_dialog.render();
        } else {
            return;  //there is no legend so don't do anything
        }
    }

    legend_dialog.show();
};

    var portalDisconnectedPanel = null;
    function buildPortalDisconnectedPanel(){
        if(!portalDisconnectedPanel){

            portalDisconnectedPanel = new YAHOO.widget.Panel("portalDisconnectedPanel", {
                width: '475px',
                close: false,
                draggable:false,
                constraintoviewport: true,
                underlay: "shadow",
                visible: false,
                fixedcenter:true,
                modal:true
            });
            portalDisconnectedPanel.setHeader(I18n.t("main.portal.down.header"));
            portalDisconnectedPanel.setBody(I18n.t("main.portal.down.body"));
            portalDisconnectedPanel.render(document.body);
        }
    }


var portalNeedsRestart = false;
    Event.observe(window, "pushdaemon:disconnect", function(ev){
        if(ev.memo && ev.memo.msg){
            buildPortalDisconnectedPanel();
            portalDisconnectedPanel.show();
            portalNeedsRestart = true;
        }
    });
    Event.observe(window, "pushdaemon:heartbeat", function(){
        if(portalNeedsRestart){
            window.location.reload();
        }
    });

