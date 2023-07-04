/*
 * FILENAME:    ruler.js
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
 * @fileoverview This file provides a number of ruler based controls.
 */
 
/** Fotech namespace. */
var fotech = (fotech ? fotech : {});

/** Fotech gui namespace. */
fotech.gui = (fotech.gui ? fotech.gui : {});

/**
 * Construct a ruler . You may use the following
 * attributes to customize the display. Note that you will need to call draw when
 * you change these before the changes will take effect.
 *  orientation - can be 'vertical-right' (the default), 'vertical-left', 'horizontal-top' 
 *      or 'horizontal-bottom'.
 *  start - the value at the top of the ruler.
 *  end - the value at the bottom of the ruler.
 *  units - a text string denoting the units the ruler values are in.
 *  border - the size of the border in pixels. The default is 2.
 *  majorTickSize - the size of the major ticks in pixels. The default is 15.
 *  minorTickSize - the size of the minor ticks in pixels. The default is 5.
 *  textInterval - the desired text interval in pixels. The default is 150.
 *  displayStart, displayEnd - used to zoom in to a portion of the display.
 *  trackingPosition - the x (for horizontal rulers) or y (for vertical rulers) at which
 *      to display a highlight. Set this to null to remove the highlight.
 *
 * @constructor
 * @param start The value at the top of the ruler.
 * @param end The value at the bottom of the ruler.
 *
 * @class
 * A vertical ruler.
 */
fotech.gui.Ruler = function(start, end) {
    fotech.gui.Control.call(this);
    this.orientation = 'vertical-right';
    this.start = start;
    this.end = end;
    this.displayStart = start;
    this.displayEnd = end;
    this.units = "";
    this.border = 2;
    this.majorTickSize = 15;
    this.minorTickSize = 5;
    this.textInterval = 150.0;
    this.trackingPosition = null;
}

fotech.gui.Ruler.prototype = new fotech.gui.Control();

/**
 * Render the component.
 * @param ctx The drawing context.
 */
fotech.gui.Ruler.prototype.render = function(ctx) {
    // Recompute the scale and determine the number of decimal places to show.
    var dims = this._getDimensions(this.width, this.height);
    this._scale = dims.height / (this.displayEnd - this.displayStart);
    var decimals = 0;
    var range = Math.abs(this.displayEnd - this.displayStart);
    if (range <= 0.01)
        decimals = 7;
    else if (range <= 0.2)
        decimals = 6;
    else if (range <= 2.0)
        decimals = 5;
    else if (range < 5.0)
        decimals = 4;
    else if (range < 10.0)
        decimals = 3;
    else
        decimals = 2;
    
    // Draw the vertical ruler edge.
    ctx.strokeStyle = "black";
    ctx.lineCap = "butt";
    ctx.globalAlpha = 1.0;
    ctx.lineWidth = 2.0;
    var x = dims.width - this.border;
    ctx.beginPath();
    var pt = this._getCoordinate(x, this._unitToPixel(this.start));
    ctx.moveTo(pt.x, pt.y);
    pt = this._getCoordinate(x, this._unitToPixel(this.end));
    ctx.lineTo(pt.x, pt.y);
    ctx.stroke();
    
    // Determine what the major tick increment should be and ensure we only have to deal
    // with positive numbers.
    var textIntervalDist = fotech.util.niceNumber(this.textInterval / this._scale);
    var shortTickDist = textIntervalDist / 10.0; 
    var drawShortTicks = ((shortTickDist * this._scale) > 3);
    var ystart, yend;
    if (textIntervalDist >= 0) {
        ystart = this._computeNiceStart(this.start, textIntervalDist);
        yend = this.end;
    }
    else {
        textIntervalDist = -textIntervalDist;
        ystart = this._computeNiceStart(this.end, textIntervalDist);
        yend = this.start;
    }
    
    // Draw the ticks and labels.
    var xlong = x - this.majorTickSize;
    var xshort = x - this.minorTickSize;
    var xmid = (xlong + xshort) / 2.0;
    var renderLabel;
    
    for (var y = ystart; y <= yend; y += textIntervalDist) {
        ctx.lineWidth = 1.5;                // Main ticks and labels.
        if (this._isVisible(y)) {       
            renderLabel = !this._withinFinalLabel(y, dims);
            this._drawTick(ctx, xlong, x, y, renderLabel, decimals, dims);
        }
        
        ctx.lineWidth = 1.0;                // Mid and minor ticks.
        for (var j = 1; j < 10; ++j) {
            var yMinor = y + (j * shortTickDist);
            if (!this._isVisible(yMinor))
                continue;
            if ((j % 5) == 0)
                this._drawTick(ctx, xmid, x, yMinor, false, decimals, dims);
            else if(drawShortTicks)
                this._drawTick(ctx, xshort, x, yMinor, false, decimals, dims);
        }
    }
    
    // Draw the highlight.
    this.renderHighlight(ctx);
}


/**
 * Draw the highlight if it is set. This should be considered a protected method. It is
 * made available for the sake of subclasses who redefine the render method. It MUST only
 * be called from withing a render method.
 *
 * @param ctx The drawing context.
 */
fotech.gui.Ruler.prototype.renderHighlight = function(ctx) {
    if (this.trackingPosition) {
        ctx.strokeStyle = "black";
        ctx.lineCap = "butt";
        ctx.globalAlpha = 0.25;
        ctx.lineWidth = 2.0;
        ctx.beginPath();
        if (this.orientation == 'vertical-right' || this.orientation == 'vertical-left') {
            ctx.moveTo(0, this.trackingPosition);
            ctx.lineTo(this.width, this.trackingPosition);
        }
        else {
            ctx.moveTo(this.trackingPosition, 0);
            ctx.lineTo(this.trackingPosition, this.height);
        }
        ctx.stroke();
    }
}

// Returns true if the depth is within the visible range.
fotech.gui.Ruler.prototype._isVisible = function(depth) {
    if (this.end > this.start)
        return depth >= this.start && depth >= this.displayStart
        && depth <= this.end && depth <= this.displayEnd;
    else
        return depth >= this.end && depth >= this.displayEnd
        && depth <= this.start && depth <= this.displayStart;
}

// Compute a nice starting number that takes the interval into account.
fotech.gui.Ruler.prototype._computeNiceStart = function(start, interval) {
    return Math.floor(start / interval) * interval;
}

/**
 * Return the dimensions of the ruler. Subclasses must redefine this if they are
 * rotating the coordinate system.
 * @return an object with width and height attributes.
 */
fotech.gui.Ruler.prototype._getDimensions = function() {
    if (this.orientation == 'vertical-right' || this.orientation == 'vertical-left')
        return {width: this.width, height: this.height};
    else if (this.orientation == 'horizontal-top' || this.orientation == 'horizontal-bottom')
        return {width: this.height, height: this.width};
    else
        throw "Invalid orientation '" + this.orientation + "'.";
}

/**
 * Given an x and a y, return a coordinate. Subclasses must redefine this if they
 * are rotating the coordinate system.
 * @param x the x coordinate.
 * @param y the y coordinate.
 * @return the dimension object. This will have an x and y attribute.
 */
fotech.gui.Ruler.prototype._getCoordinate = function(x, y) {
    if (this.orientation == 'vertical-right')
        return {x: x, y: y};
    else if (this.orientation == 'vertical-left')
        return {x: this.width - x, y: y};
    else if (this.orientation == 'horizontal-top')
        return {x: y, y: this.height - x};
    else if (this.orientation == 'horizontal-bottom')
        return {x: y, y: x};
}

/**
 * Shift the x and y positions of the given coordinate in order to properly position
 * the text. Subclasses must redefine this if they are rotating the coordinate system.
 * @param pt the original coordinate. Modified on exit.
 * @param str the text to be shifted.
 */
fotech.gui.Ruler.prototype._shiftText = function(pt, str) {
    if (this.orientation == 'vertical-right')
        return;
    
    
    var textWidth = get_textWidth(str, 8);
    if (this.orientation == 'vertical-left') {
        pt.x = pt.x - textWidth + 6;
        if (pt.x < 0)
            pt.x = 0;
        if (pt.x > (this.width - textWidth))
            pt.x = this.width - textWidth;
    }
    else if (this.orientation == 'horizontal-top') {
        pt.x = pt.x - (textWidth / 2.0) + 6;
        if (pt.x < 0)
            pt.x = 0;
        if (pt.x > (this.width - textWidth))
            pt.x = this.width - textWidth;
        pt.y = pt.y - this.height + this.majorTickSize + 6;
    }
    else if (this.orientation == 'horizontal-bottom') {
        pt.x = pt.x - (textWidth / 2.0) + 6;
        if (pt.x < 0)
            pt.x = 0;
        if (pt.x > (this.width - textWidth))
            pt.x = this.width - textWidth;
    }
}

/**
 * Returns true if the given depth will result in a label that will overlap with the
 * final one. Subclasses must redefine this if they are rotating or shifting the
 * text labels.
 * @param val the unit value.
 * @param dims the window dimensions.
 * @return true if we have a conflict
 */
fotech.gui.Ruler.prototype._withinFinalLabel = function(val, dims) {
    if (this.orientation == 'vertical-top' || this.orientation == 'vertical-bottom')
        return (this._unitToPixel(val) > (dims.height - 15));
    else
        return (this._unitToPixel(val) > (dims.height - 50));
}

// Convert a unit value to a pixel value. 
fotech.gui.Ruler.prototype._unitToPixel = function(unitVal) {
    return (unitVal - this.displayStart) * this._scale;
}

// Draw a tick. This method should be considered private.
fotech.gui.Ruler.prototype._drawTick = function(ctx, x1, x2, val, label, decimals, dims) {
    var y = this._unitToPixel(val);
    if (y >= dims.height)
        y = dims.height - 1;
    if (ctx.lineWidth == 1)             // Force a "sharp" tick.
        y = Math.floor(y) + 0.5;
    
    ctx.beginPath();                    // Draw the tick.
    var pt = this._getCoordinate(x1, y);
    ctx.moveTo(pt.x, pt.y);
    pt = this._getCoordinate(x2, y);
    ctx.lineTo(pt.x, pt.y);
    ctx.stroke();
    
    if (label) {                        // Draw the label.
        y -= 4;
        if (y <= 0)
            y = 1;
        if (y >= (dims.height - 8))
            y = dims.height - 9;
        if (decimals > 0)
            val *= Math.pow(10, decimals);
        val = Math.round(val);
        if (decimals > 0)
            val /= Math.pow(10, decimals);
        pt = this._getCoordinate(this.border, y);

        var txt = "" + val + this.units;
        this._shiftText(pt, txt);
        ctx.strokeText(txt, pt.x, pt.y, 8);
    }
}





