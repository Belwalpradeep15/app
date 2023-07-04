/*
 * FILENAME:    control.js
 * AUTHOR:      Steven Klassen
 * CREATED ON:  2009-04-06
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
 * @fileoverview Base control class for controls drawn in canvases.
 */
 
/** Fotech namespace. */
var fotech = (fotech ? fotech : {});

/** Fotech gui namespace. */
fotech.gui = (fotech.gui ? fotech.gui : {});

/**
 * Construct a control. A control will contain an x, y, width, and height (all settable)
 * which it will use to determine how to draw itself. It must also override the render method
 * if you actually want to draw something.
 * @constructor
 *
 * @class
 * The base class for fotech controls.
 */
fotech.gui.Control = function() {
    this.x = null;
    this.y = null;
    this.width = null;
    this.height = null;
    this.mustClear = true;
    this.clearOnNextRedraw = true;
}

/**
 * Draw the component into the given context. This will position it according to the
 * x,y coordinates and clip it to the width,height values. Then it calls the render
 * method.
 *
 * @param ctx The drawing context.
 */
fotech.gui.Control.prototype.draw = function(ctx) {
    if (this.x == null || this.y == null || this.width == null || this.height == null
        || this.x < 0 || this.y < 0 || this.width <= 0 || this.height <= 0)
        return;
    
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.beginPath();
    ctx.rect(0, 0, this.width, this.height);
    ctx.clip();
    if (this.mustClear || this.clearOnNextRedraw)
        ctx.clearRect(0, 0, this.width, this.height);
    this.render(ctx);
    ctx.restore();
    this.clearOnNextRedraw = false;
}

/**
 * Render (really draw) the component. Subclasses must override this if they want the
 * control to actually do anything. When drawing you can assume that 0,0 is the top, left
 * corner of your drawing area and that width, height define the drawing size. The x,y
 * members will be the offset from the origin of the parent control.
 *
 * @param ctx The drawing context.
 */
fotech.gui.Control.prototype.render = function(ctx) {
}

/**
 * Determine if a point is within this control.
 * @param x the points x coordinate.
 * @param y the points y coordinate.
 * @return true if the point is within this control.
 */
fotech.gui.Control.prototype.contains = function(x, y) {
    if (this.x != null && this.y != null && this.width != null && this.height != null)
        return (x >= this.x && x <= (this.x + this.width) && y >= this.y && y <= (this.y + this.height));
    else
        return false;
}

/**
 * returns the x,y coordinates of a click within the bounds of the control
 */
fotech.gui.Control.prototype.relativePosition = function(x, y) {
  return {x: (x - this.x), y: (y - this.y)};
};

/**
 * Construct a container type control. A container is a control that consists of a number
 * of child controls together with the knowledge of how to lay them out relative to each
 * other.
 * @constructor
 *
 * @class
 * The base class for container controls.
 */
fotech.gui.Container = function() {
    fotech.gui.Control.call(this);
    this.children = {};
    this.mustClear = false;
}

fotech.gui.Container.prototype = new fotech.gui.Control();

/**
 * Add a child component. After calling this method child.parent will point to this
 * container.
 *
 * @param key Used to refer to the child.
 * @param child The child component.
 */
fotech.gui.Container.prototype.add = function(key, child) {
    this.children[key] = child;
    child.parent = this;
}

/** 
 * Layout the children. This should be called after you have added the child components
 * and before you call draw or render. It must be overridden by your subclass in order
 * to do anything useful.
 */
fotech.gui.Container.prototype.layout = function() {
}

/**
 * We override the render method to layout the children and call their draw methods.
 * @param ctx The drawing context.
 */
fotech.gui.Container.prototype.render = function(ctx) {
    this.layout();
    if (this.mustClear || this.clearOnNextRedraw)
        ctx.clearRect(0, 0, this.width, this.height);
    this.clearOnNextRedraw = false;
    for (var key in this.children)
        this.children[key].draw(ctx);
}




