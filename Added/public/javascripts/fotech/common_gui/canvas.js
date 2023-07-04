/*
 * FILENAME:    canvas.js
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
 * @fileoverview Canvas class. A container whose children are rendered into a canvas.
 */
 
/** Fotech namespace. */
var fotech = (fotech ? fotech : {});

/** Fotech gui namespace. */
fotech.gui = (fotech.gui ? fotech.gui : {});


/**
 * Construct a canvas type control. A canvas is a container that is drawn into a canvas
 * tag of the given name. Any control can be rendered into a canvas by adding it as the
 * only child of this control. More complex controls will want to inherit from this class
 * and override the layout method to lay the child controls out as required. Note that
 * a canvas control typically has no parent.
 *
 * @constructor
 * @param canvasId The id of the canvas tag.
 *
 * @class
 * A class used to render a control onto a canvas. The canvas will support the following
 * custom events:
 *    canvas:draw - fired just after the canvas is redrawn. The memo will contain an
 *          element called "context" which is the drawing context of the canvas.
 */
fotech.gui.Canvas = function(canvasId) {
    fotech.gui.Container.call(this);
    this.canvasId = canvasId;
    this._currentChildControl = null;
    this._overlays = {};
}

fotech.gui.Canvas.prototype = new fotech.gui.Container();

/**
 * We override the layout method to give the children the full size of the control.
 * Subclasses may override this to provide more complex layouts.
 */
fotech.gui.Canvas.prototype.layout = function() {
    var child = null;
    for (var key in this.children) {
        child = this.children[key];
        child.x = 0;
        child.y = 0;
        child.width = this.width;
        child.height = this.height;
    }
}

/**
 * Add an overlay. Overlays should be subclasses of the fotech.gui.Overlay class
 * and will be rendered into the canvas after all the child rendering has been
 * completed.
 * @param key Used to identify the overlay.
 * @param overlay An instance of an overlay.
 */
fotech.gui.Canvas.prototype.addOverlay = function(key, overlay) {
    this._overlays[key] = overlay;
}

/**
 * Returns the given overlay or null if it does not exist.
 * @param key The overlay to search for.
 */
fotech.gui.Canvas.prototype.getOverlay = function(key) {
    if (typeof(this._overlays[key] != 'undefined'))
        return this._overlays[key];
    else
        return null;
}

/**
 * Removes the given overlay if it exists.
 * @param key The overlay to remove.
 * @return true if an overlay was removed (i.e. if it existed) and false if nothing changed.
 */
fotech.gui.Canvas.prototype.removeOverlay = function(key) {
    if (typeof(this._overlays[key] != 'undefined')) {
        delete this._overlays[key];
        return true;
    }
    return false;
}

/**
 * Register the requested listeners. The listeners should either the a single text
 * string with the name of the event or an array of such strings. The listener will
 * call the appropriate method of the first child found whose coordinates match the
 * event position and who has an appropriate handler defined. The handler is related
 * to the name of the event. For example, "mousedown" will require a method called
 * onMouseDown. All the event handlers should take a single event argument.
 *
 * Note that the event objects passed to the event handlers will have canvasX and
 * canvasY attributes added to them that provide the x and y coordinates of the event
 * in relation to the top-left corner of the containing canvas object.
 *
 * Presently the following listeners are supported:
 *  mousedown - onMouseDown
 *  mousemove - onMouseMove
 *  mouseup - onMouseUp
 *  click - onClick
 *  dblclick - onDblClick
 *
 * @param listeners the name of the listeners to register.
 */
fotech.gui.Canvas.prototype.registerEventListeners = function(listeners) {
    var canvas = document.getElementById(this.canvasId);
    if (typeof(listeners) == 'string')
        this._registerListener(canvas, listeners);
    else {
        for (var i = 0; i < listeners.length; ++i)
            this._registerListener(canvas, listeners[i]);
    }
}

// Register an event handler.
fotech.gui.Canvas.prototype._registerListener = function(canvas, listenerName) {
    if (listenerName == 'mousedown')
        YAHOO.util.Event.addListener(canvas, listenerName, fotech.gui.Canvas._onMouseDown, this);
    else if (listenerName == 'mousemove')
        YAHOO.util.Event.addListener(canvas, listenerName, fotech.gui.Canvas._onMouseMove, this);
    else if (listenerName == 'mouseup')
        YAHOO.util.Event.addListener(canvas, listenerName, fotech.gui.Canvas._onMouseUp, this);
    else if (listenerName == 'click')
        YAHOO.util.Event.addListener(canvas, listenerName, fotech.gui.Canvas._onClick, this);
    else if (listenerName == 'dblclick')
        YAHOO.util.Event.addListener(canvas, listenerName, fotech.gui.Canvas._onDblClick, this);
}

// The events are passed to the first appropriate child.
fotech.gui.Canvas._onMouseDown = function(ev, self) {
    var cont;
    self.addCanvasXY(ev);
    for (var key in self.children) {
        cont = self.children[key];
        if (typeof(cont.onMouseDown) == 'function' && cont.contains(ev.canvasX, ev.canvasY)) {
            self._currentChildControl = cont;
            cont.onMouseDown(ev);
        }
    }
}
fotech.gui.Canvas._onMouseMove = function(ev, self) {
    self.addCanvasXY(ev);
    if (self._currentChildControl != null && typeof(self._currentChildControl.onMouseMove) == 'function')
        self._currentChildControl.onMouseMove(ev);
}
fotech.gui.Canvas._onMouseUp = function(ev, self) {
    self.addCanvasXY(ev);
    if (self._currentChildControl != null && typeof(self._currentChildControl.onMouseUp) == 'function') {
        self._currentChildControl.onMouseUp(ev);
        self._currentChildControl = null;
    }
}
fotech.gui.Canvas._onClick = function(ev, self) {
    var cont;
    self.addCanvasXY(ev);
    for (var key in self.children) {
        cont = self.children[key];
        if (typeof(cont.onClick) == 'function' && cont.contains(ev.canvasX, ev.canvasY))
            cont.onClick(ev);
    }
}    
fotech.gui.Canvas._onDblClick = function(ev, self) {
    var cont;
    self.addCanvasXY(ev);
    for (var key in self.children) {
        cont = self.children[key];
        if (typeof(cont.onDblClick) == 'function' && cont.contains(ev.canvasX, ev.canvasY))
            cont.onDblClick(ev);
    }
}    

/**
 * Add canvasX and canvasY to the event. These will be x and y coordinates with respect
 * to the upper-left corner of the canvas.
 *
 * Note that you do not need to call this for events registered via registerEventListeners
 * as it will already have been done for you. But you may want to use this if you are
 * adding other event handlers manually.
 *
 * @param ev the event to modify.
 */
fotech.gui.Canvas.prototype.addCanvasXY = function(ev) {
    var xy = YAHOO.util.Dom.getXY(document.getElementById(this.canvasId));
    ev.canvasX = ev.clientX - xy[0];
    ev.canvasY = ev.clientY - xy[1];
}    

/**
 * Redraw the component. Your HTML page will need to call this method in order to render
 * the component into the canvas.
 */
fotech.gui.Canvas.prototype.redraw = function() {
    var canvas = document.getElementById(this.canvasId);
    this.x = 0;
    this.y = 0;
    this.width = canvas.width;
    this.height = canvas.height;
    var ctx = canvas.getContext("2d");
    if (!check_textRenderContext(ctx))
        set_textRenderContext(ctx);
    this.draw(ctx);
    for (var key in this._overlays) {
        ctx.save();
        this._overlays[key].render(ctx);
        ctx.restore();
    }
    canvas.fire("canvas:draw", { context: ctx });
}

