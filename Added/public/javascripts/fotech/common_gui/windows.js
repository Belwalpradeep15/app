/*
 * FILENAME:    windows.js
 * AUTHOR:      Steven Klassen
 * CREATED ON:  2009-02-10
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

/**
 * @fileoverview Javascript class used to manage popup windows.
 */
 
/** Fotech namespace. */
var fotech = (fotech ? fotech : {});

/** Fotech gui namespace. */
fotech.gui = (fotech.gui ? fotech.gui : {});

/**
 * Helper method that will get the top most opener
 *
 * @return the top most opener which should be the Fotech.main page
 */
fotech.gui.rootOpener = function(){
    var w = window;
    while(w.opener != null && (typeof(w.isMainPanoptes) == 'undefined' || !w.isMainPanoptes))
        w = w.opener;

    if ( !w.user ) {
        try {
            /* The additional properties in the store are an object (with things such as preferences etc) as
            keys in it, each of those is another object of "property" pairs which are themselves a property
            with the "value" keyword being the actual value of the property.  Such as ..
            {
                "preferences": { "foo": { ..., "value": "bar" } }
            }

            Reduce this down into a simple { "preferences": { "foo": "bar" }} notation */
            var additional = Object.keys( vueApp.$user.additional || {} )
                    .reduce( function(res, key){
                        var additionalDetail = vueApp.$user.additional[ key ];
                        if ( typeof( additionalDetail ) == 'object' ){
                            res[ key ] = Object.keys( additionalDetail ).reduce( function( addition, k ){
                                addition[ k ] = additionalDetail[ k ].value;
                                return addition;
                            }, {} );
                        } else {
                            res[ key ] = additionalDetail;
                        }
                        return res;
                    }, {} );

            w.user = Object.assign(
                {},
                vueApp.$user,
                additional || {} );
        } catch ( e ) {
            console.log( 'Cannot backfill user', e );
        };
    }

    return w;
}

/**
 * Return the X absolute position of an HTML object. This is based on code found at
 * http://blog.firetree.net/2005/07/04/javascript-find-position/ which has been placed
 * into the public domain.
 * @param obj The HTML element.
 * @return the x absolute position.
 */
fotech.gui.getX = function(obj) {
    var curleft = 0;
    if(obj.offsetParent)
        while(1) 
        {
            curleft += obj.offsetLeft;
            if(!obj.offsetParent)
                break;
            obj = obj.offsetParent;
        }
    else if(obj.x)
        curleft += obj.x;
    return curleft;
}

/**
 * Return the Y position of an HTML object. This is based on code found at
 * http://blog.firetree.net/2005/07/04/javascript-find-position/ which has been placed
 * into the public domain.
 * @param obj The HTML element.
 * @return the y absolute position.
 */
fotech.gui.getY = function(obj) {
    var curtop = 0;
    if(obj.offsetParent)
        while(1)
        {
            curtop += obj.offsetTop;
            if(!obj.offsetParent)
                break;
            obj = obj.offsetParent;
        }
    else if(obj.y)
        curtop += obj.y;
    return curtop;
}

/**
 * Move the given panel back into the window if it is out of view.
 * @param panel The panel to move.
 */
fotech.gui.moveBackIntoWindow = function(panel) {
    if (panel == null)
        return;

        return;
    
    var dims = document.viewport.getDimensions();
    var changeX = false;
    var changeY = false;
    if (panel.element.offsetLeft + panel.element.offsetWidth + 5 > dims.width)
        changeX = true;
    if (panel.element.offsetTop + panel.element.offsetHeight + 45 > dims.height)
        changeY = true;
    
    if (changeX || changeY) {
        var x = panel.element.offsetLeft;
        if (changeX)
            x = dims.width - panel.element.offsetWidth - 5;
        var y = panel.element.offsetTop;
        if (changeY)
            y = dims.height - panel.element.offsetHeight - 45;
        panel.moveTo(x, y);
    }
}

/**
 * Preload an array of images.
 */
fotech.gui.preload = function(images) {
    if (document.images) {
        var i, len = images.length;
        var im = new Image();
        for (i = 0; i < len; ++i) {
            im.src = images[i];
        }
    }
}


/**
 * Construct a new child window manager. This manager will keep track of windows labelled
 * by a unique text id. It also provides mechanisms to find windows, to determine if they
 * are currently open, and to close them as a set.
 *
 * @constructor
 * @param parent The parent window.
 *
 * @class
 * This class provides a container for managing popup windows.
 */
fotech.gui.ChildWindowManager = function(parent) {
    this.parent = parent;
    this.children = {};
}

/**
 * Register a child window with the manager. Any child window you want managed by this
 * class needs to be registered. If the key refers to a window that is already managed
 * then it will be replaced.
 * @param key The key used to identify this child.
 * @param window The window to be managed.
 * @return The window id.
 */
fotech.gui.ChildWindowManager.prototype.registerChild = function(key, window) {
    if(!window)
        alert(I18n.t('common.popups_required'));
    
    if(window && window.focus)
        window.focus();
    
    this.children[key] = window;
    return window;
}

/**
 * Returns true if the given key has a window that has been registered and is currently open.
 * @param key The key used to search for the child window.
 * @return true if the window exists and is open.
 */
fotech.gui.ChildWindowManager.prototype.isOpen = function(key) {
    return (this.children[key] != null && !this.children[key].closed);
}

/**
 * Returns the window for the given key. If there is no such window registered null is returned.
 * Note that it is possible to have a non-null return value for a window that is closed.
 * @param key the key to the window you are looking for.
 * @return the window.
 */
fotech.gui.ChildWindowManager.prototype.get = function(key) {
    return this.children[key];
}

/**
 * Run the given function on each managed child window. The function should take two arguments,
 * the key and the window, which will be passed into it.
 * @param fn A function of the form fn(key, window) that will be called on each managed window.
 */
fotech.gui.ChildWindowManager.prototype.forEach = function(fn) {
    for (key in this.children)
        fn(key, this.children[key]);
}

