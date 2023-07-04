/*
 * FILENAME:    select_region.js
 * AUTHOR:      Steven Klassen
 * CREATED ON:  2009-03-05
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
 * @fileoverview Provides a graphical selection for maps and diagrams.
 */
 
/** Fotech namespace. */
var fotech = (fotech ? fotech : {});

/** Fotech map namespace. */
fotech.map = (fotech.map ? fotech.map : {});


/**
 * Construct the SelectRegionControl.
 * @constructor
 * @param selectCallback the function called when an area has been selected.
 * @param deselectCallback the function called when the area has been deselected.
 *
 * @class
 * The SelectRegionControl class implements a GControl that allows a region of the
 * map to be selected.
 */
fotech.map.SelectRegionControl = function(selectCallback, deselectCallback) {
    this.selectCallback = selectCallback;
    this.deselectCallback = deselectCallback;
    this.clickedStart = false;
    this.inSelect = false;
}

fotech.map.SelectRegionControl.selectImg = 'plus';
fotech.map.SelectRegionControl.deSelectImg = 'minus';

fotech.map.SelectRegionControl.prototype.setMap = function(map){
    this._fotechMap = map;
}

// Start the selection.
fotech.map.SelectRegionControl.prototype.__startSelection = function() {
    if (this.selectCallback != null) {
        if (this.clickedStart)
            this.__reset();
        else
            this.__set();
    }
}

// Set (start) the selection.
fotech.map.SelectRegionControl.prototype.__set = function() {
    this.selectControl.addClassName("enabled");
    this.overlay.style.visibility = "visible";
    this.clickedStart = true;
    this.inSelect = false;
}

// Reset (cancel) the selection.
fotech.map.SelectRegionControl.prototype.__reset = function() {
    this.selectControl.removeClassName("enabled");
    this.overlay.style.visibility = "hidden";
    this.selection.style.visibility = "hidden";
    this.clickedStart = false;
    this.inSelect = false;
}

// Mouse down in the overlay.
fotech.map.SelectRegionControl.prototype.__mouseDown = function(e) {
    this.inSelect = true;
    this.startX = e.clientX;
    this.startY = e.clientY;
    this.selection.style.left = e.clientX + "px";
    this.selection.style.top = e.clientY + "px";
    this.selection.style.width = "1px";
    this.selection.style.height ="1px";
    this.selection.style.visibility = "visible";
    this.selection.style.position = "fixed";
    e.stop();
}

// Mouse move in the overlay.
fotech.map.SelectRegionControl.prototype.__mouseMove = function(e) {
    if (this.inSelect) {
        this.selection.style.left = Math.min(this.startX, e.clientX) + "px";
        this.selection.style.top = Math.min(this.startY, e.clientY) + "px";
        this.selection.style.width = Math.abs(e.clientX - this.startX) + "px";
        this.selection.style.height = Math.abs(e.clientY - this.startY) + "px";
    }
    e.stop();
}

// Mouse up in the overlay.
fotech.map.SelectRegionControl.prototype.__mouseUp = function(e) {
    if (this.inSelect) {
        this.__reset();
        if (this.selectCallback) {
            var xshift = fotech.gui.getX(this.overlay);
            var yshift = fotech.gui.getY(this.overlay);
            var startX = Math.min(this.startX, e.clientX) - xshift;
            var endX = Math.max(this.startX, e.clientX) - xshift;
            var startY = Math.min(this.startY, e.clientY) - yshift;
            var endY = Math.max(this.startY, e.clientY) - yshift;
            var sw = this._fotechMap.getPositionFromPixel(new fotech.geom.Point(startX, endY));
            var ne = this._fotechMap.getPositionFromPixel(new fotech.geom.Point(endX, startY));
            var bnds = new fotech.geom.gis.Bounds([sw, ne]);
            Event.fire(window, 'fotech:boundsSelected', {bounds:bnds});
            if (this.selectCallback(this._fotechMap, bnds)){
                this.deselectControl.style.display = "block";
                this.selectControl.style.display = "none";
            } else
                this.__clearSelection();
        }
    }
    e.stop();
}

// Clear the selection.
fotech.map.SelectRegionControl.prototype.__clearSelection = function() {
    if (this.deselectCallback) {
        this.deselectCallback(this._fotechMap);
        this.deselectControl.style.display = "none";
        this.selectControl.style.display = "block";

    }
    Event.fire(window, 'fotech:boundsDeselected');
}

/**
 * Create the control on the map. This will be called by the Google Maps infrastructure
 * and should not be called manually.
 * @param map the map to install the control on.
 * @return the new control container.
 */
fotech.map.SelectRegionControl.prototype.initialize = function(map) {
    var self = this;
    var mapCont = map.getContainer();
    var container = new Element("div");
    this.map = map;

    var select = new Element("div");
    this.__setButtonStyle(select);
    select.style.visibility = "visible";
    container.appendChild(select);
    select.appendChild(this.__createButton(fotech.map.SelectRegionControl.selectImg, "Select search area"));
    select.observe("click", this.__startSelection.bind(this));
    this.selectControl = select;

    var deselect = new Element("div");
    this.__setButtonStyle(deselect);
    deselect.style.display = "none";

    container.appendChild(deselect);
    deselect.appendChild(this.__createButton(fotech.map.SelectRegionControl.deSelectImg, "Remove selected search area"));
    deselect.observe("click", this.__clearSelection.bind(this));
    this.deselectControl = deselect;
    
    this.overlay = new Element("div");
    this.overlay.setStyle({cursor: "cr osshair",
                            background: "black",
                            opacity: "0",
                            visibility: "hidden",
                            position: "absolute",
                            width: "100%",
                            height: "100%",
                            zIndex: 2000});
    mapCont.parentElement.insertBefore(this.overlay, mapCont);
    this.overlay.observe('mousedown', this.__mouseDown.bind(this));
    this.overlay.observe('mousemove', this.__mouseMove.bind(this));
    this.overlay.observe('mouseup', this.__mouseUp.bind(this));
    
    this.selection = new Element("div");
    this.selection.setStyle({background: "rgb(125,125,125)",
                             opacity: "0.25",
                             border: "1px solid black",
                             visibility: "hidden",
                             position: "fixed",
                             cursor: "pointer", zIndex:2000, pointerEvents:"none"});
    mapCont.parentElement.appendChild(this.selection);

    mapCont.appendChild(container);
    this.container = container;
    return container;
}

/**
 * Returns the default position on the map. The default position is top left with 10 
 * pixels of padding.
 * @return the default position.
 */
fotech.map.SelectRegionControl.prototype._getDefaultPosition = function() {
    return {position:'tl', x:10, y:10};
}

// Sets the CSS for a button container. This method should be considered private.
fotech.map.SelectRegionControl.prototype.__setButtonStyle = function(button) {
    button.style.border = "none";
    button.style.padding = 0;
    button.style.margin = 0;
    button.style.marginBottom = "5px";
}

// Create a button with the given image and callback.
fotech.map.SelectRegionControl.prototype.__createButton = function( imageName, helpText) {
    return this.map.menuButton( "clone", imageName, { title: helpText } );
}

