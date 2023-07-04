/*
 * FILENAME:    legend.js
 * AUTHOR:      Steven Klassen
 * CREATED ON:  2010-10-30
 * 
 * DESCRIPTION: Javascript related to the legend monitor object. This is automatically
 *      included when you include the /monitor/main/legend partial. 
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

/** Monitor namespace. */
var monitor = (monitor ? monitor : {});

/** Legend namespace. */
monitor.legend = (monitor.legend ? monitor.legend : {});


// Internal state of the panel.
monitor.legend.__panel = null;
monitor.legend.__menuItem = null;
monitor.legend.__isFixedBox = false;
if (typeof(__monitorLegendMenuItemName) != 'undefined') {
    if (jsmenubar) {
        monitor.legend.__menuItem = fotech.gui.getMenuItemById(jsmenubar, __monitorLegendMenuItemName);
        delete __monitorLegendMenuItemName;
    }
}
if (typeof(__monitorLegendFixedBox) != 'undefined') {
    monitor.legend.__isFixedBox = __monitorLegendFixedBox;
}

// Internal function called when the page is loaded.
monitor.legend.__onload = function() {
    var params = "";
    if (typeof(eventTypes) != 'undefined' && eventTypes.length > 0) {
        params = "?eventTypes="+ eventTypes.pluck('name').join(',');
    }
    new Ajax.Updater('legend', '/monitor/main/legend' + params, { method: 'get', evalScripts: true });
}

/** Display the legend. */
monitor.legend.show = function() {
    if (!monitor.legend.__panel) {      // If it hasn't finished loading yet, try a bit later.
        window.setTimeout('monitor.legend.show()', 2000);
        return;
    }
    monitor.legend.__panel.show();
}

/** Hide the legend. */
monitor.legend.hide = function() {
    if (monitor.legend.__panel)
        monitor.legend.__panel.hide();
}

// Internal function used to toggle the legend based on the state of the menu item.
monitor.legend.__toggle = function() {
    if (monitor.legend.__menuItem) {
        if (monitor.legend.__menuItem.cfg.getProperty('checked')) 
            monitor.legend.show();
        else
            monitor.legend.hide();
    }
}

Event.observe(window, 'load', function() { monitor.legend.__onload(); });
Event.observe(window, 'resize', function() { fotech.gui.moveBackIntoWindow(monitor.legend.__panel); });
              
