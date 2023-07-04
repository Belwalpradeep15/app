/*
 * FILENAME:    document.js
 * AUTHOR:      Steven Klassen
 * CREATED ON:  2010-10-30
 * 
 * DESCRIPTION: Additions to the document object.
 *
 * LAST CHANGE:
 * $Author$
 *   $Date$
 *    $Rev$
 *    $URL$
 *
 * COPYRIGHT:
 * This file is Copyright © 2010 Fotech Solutions Ltd. All rights reserved. This is based
 * on code orginally written by Klassen Software Solutions and is used with permission and
 * without restriction. If desired the original may be obtained via www.kss.cc.
 */

/**
 * @fileoverview Mixins for the document object.
 */
 
/**
 * Load a javascript file in a non-blocking fashion. This is accomplished by adding a
 * new script element to the HEAD portion of the document.
 *
 * This code is based on examples found in "High Performance Javascript" by Zakas.
 *
 * @param url the url of the javascript file to load.
 * @param callback (optional) if present this is called when the javascript file has completed loading
 */
Document.prototype.loadScript = function(url, callback) {
    var script = document.createElement("script");
    script.type = "text/javascript";
    
    if (callback) {
        if (script.readyState) {    // Internet Explorer
            script.onreadystatechange = function() {
                if (script.readyState == "loaded" || script.readyState == "complete") {
                    script.onreadystatechange = NULL;
                    callback();
                }
            };
        }
        else {                      // Other browsers
            script.onload = function() {
                callback();
            };
        }
    }
    
    script.src = url;
    document.getElementsByTagName("head")[0].appendChild(script);
}


