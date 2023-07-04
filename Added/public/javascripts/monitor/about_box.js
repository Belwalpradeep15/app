/*
 * FILENAME:    about_box.js
 * AUTHOR:      Steven Klassen
 * CREATED ON:  2010-03-01
 * 
 * DESCRIPTION: Javascript supporting the about box.
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

// Show the about box.
var aboutBox = null;
function showAboutBox() {
    if (!aboutBox) {
        aboutBox = new YAHOO.widget.Panel("about_box", { visible: false, constraintoviewport: true });
        aboutBox.render(document.body);
        if(typeof overlayManager != 'undefined')
            overlayManager.register(aboutBox);
    }
    aboutBox.center();
    aboutBox.show();
}

