/*
 * FILENAME:    layout.js
 * AUTHOR:      Steven Klassen
 * CREATED ON:  2009-04-09
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
 * This file is Copyright (c) 2009 Fotech Solutions Ltd. All rights reserved.
 */

// Move a panel back into the window if necessary.
function moveBackIntoWindow(panel) {
    if (panel == null)
        return;
    
    var changeX = false;
    var changeY = false;
    if (panel.element.offsetLeft + panel.element.offsetWidth + 5 > window.innerWidth)
        changeX = true;
    if (panel.element.offsetTop + panel.element.offsetHeight + 45 > window.innerHeight)
        changeY = true;
    
    if (changeX || changeY) {
        var x = panel.element.offsetLeft;
        if (changeX)
            x = window.innerWidth - panel.element.offsetWidth - 5;
        var y = panel.element.offsetTop;
        if (changeY)
            y = window.innerHeight - panel.element.offsetHeight - 45;
        panel.moveTo(x, y);
    }
}

// Set the status message. You can pass in a text message, a DOM element, or both.
function setStatusMessage(msg, el) {
    var status_element = $('status')
    status_element.update("");
    if (msg != null){
        Element.insert(status_element, { bottom: msg });
        if(msg != "")
            Event.fire(fotech.gui.rootOpener(), 'statusMessage:add', {msg:msg, time:new Date});
    }
    if (el != null)
        Element.insert(status_element, { bottom: el });
}

// The rest of this is called by application.html.erb and is a little touchy. Modify
// it with caution.
function onDOMReady() {
    var layout = new YAHOO.widget.Layout({
                                         units: [ { position: 'top', body: 'header', height: '54px' },
                                                 { position: 'bottom', body: 'footer', height: '30px' },
                                                 { position: 'center', body: 'content', scroll: true }]});
    layout.render();
}

// Called when the window is unloaded.
function onUnload() {
    if (window.opener)
        window.opener.setTimeout(window.opener.enableMenus, 1000);
}



YAHOO.util.Event.onDOMReady(onDOMReady);
