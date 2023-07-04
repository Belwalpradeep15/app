/*
 * FILENAME:    compatibility_checks.js
 * AUTHOR:      Steven Klassen
 * CREATED ON:  2009-12-29
 * 
 * DESCRIPTION: Perform browser compatibility checks.
 *
 * LAST CHANGE:
 * $Author$
 *   $Date$
 *    $Rev$
 *    $URL$
 *
 * COPYRIGHT:
 * This file is Copyright © 2009 Fotech Solutions Ltd. All rights reserved.
 */

/** Monitor namespace. */
var monitor = (monitor ? monitor : {});

/** Perform our compatibility checks. */
monitor.performCompatibilityChecks = function() {
    // Check for canvas support. If we don't have it we will forward to a page that
    // gives the user more information.
    var canvas = new Element('canvas');
    if (typeof(canvas.getContext) == 'undefined') {
        window.location = "/monitor/main/canvas_support";
        return;
    }
}
