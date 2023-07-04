/*
 * FILENAME:    overlay.js
 * AUTHOR:      Steven Klassen
 * CREATED ON:  2009-11-25
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

/**
 * @fileoverview An API used to provide overlays on canvas type controls. While this
 *      class has been designed to work with the fotech.gui.Canvas class it can be
 *      used with any object that will call its render method with a valid context.
 */
 
/** Fotech namespace. */
var fotech = (fotech ? fotech : {});

/** Fotech gui namespace. */
fotech.gui = (fotech.gui ? fotech.gui : {});



/**
 * Construct a canvas overlay. An overlay is a region on a canvas which will be rendered
 * after the main canvas rendering has been completed.
 *
 * @constructor
 * @param canvasId The id of the canvas tag.
 * @param parent (optional) The parent object - typically a fotech.gui.Canvas but can be
 *      any object that the custom overlay is expecting.
 *
 * @class
 * A class used to render overlays in a canvas.
 * Public parameters:
 *  canvasId - the id passed into the constructor. Must be a canvas tag in the HTML.
 *  parent - the parent object passed into the constructor.
 */
fotech.gui.Overlay = function(canvasId, parent) {
    this.canvasId = canvasId;
    this.parent = parent;
}

fotech.gui.Overlay.prototype = new Object();


/**
 * Render the overlay into the canvas. Subclasses must override this if they want the
 * control to actually draw anything. Note that all x,y references when drawing will be
 * relative to the underlying canvas object. The context will be automatically saved
 * before this is called and restored after when this is called from a fotech.gui.Canvas
 * class.
 *
 * @param ctx The drawing context.
 */
fotech.gui.Control.prototype.render = function(ctx) {
}

