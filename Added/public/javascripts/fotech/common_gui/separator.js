/*
 * FILENAME:    separator.js
 * AUTHOR:      Steven Klassen
 * CREATED ON:  2009-04-15
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
 * @fileoverview A collection of classes used to render separators in a canvas.
 */
 
/** Fotech namespace. */
var fotech = (fotech ? fotech : {});

/** Fotech gui namespace. */
fotech.gui = (fotech.gui ? fotech.gui : {});


/**
 * Construct a separator.
 * @constructor
 *
 * @class
 * A separator. 
 */
fotech.gui.Separator = function() {
    fotech.gui.Control.call(this);
    this.mustClear = true;
    this._thickness = 8;
    this._orientation = 'horizontal';
    this.height = this._thickness;
    
    this._backImg = new Image();
    this._backImg.src = '/images/fotech/common_gui/separator.gif';
}

fotech.gui.Separator.prototype = new fotech.gui.Control();

/**
 * Set the orientation of the separator. Note that this will change either the width
 * or the height depending on the new orientation.
 * @param orientation - either 'horizontal' or 'vertical'.
 */
fotech.gui.Separator.prototype.setOrientation = function(orientation) {
    if (orientation == 'horizontal')
        this.height = this._thickness;
    else if (orientation == 'vertical')
        this.width = this._thickness;
    else
        throw "Invalid orientation '" + orientation + "'.";
    
    this._orientation = orientation;
}

/**
 * Render the separator.
 * @param ctx The drawing context.
 */
fotech.gui.Separator.prototype.render = function(ctx) {
    this._retryDraw(ctx, 0, 0);
}

// Retry the draw.
fotech.gui.Separator.prototype._retryDraw = function(ctx, x, y) {
    if (this._backImg.complete)
        this._drawSeparator(ctx, x, y);
    else {
        var self = this;
        setTimeout(function() { self._retryDraw(ctx, self.x, self.y); }, 500);
    }
}

// Draw the separator at a given position.
fotech.gui.Separator.prototype._drawSeparator = function(ctx, x, y) {
    ctx.save();
    ctx.globalAlpha = 1.0;
    
    if (this._orientation == 'horizontal') {
        ctx.drawImage(this._backImg, x, y, this.width, this.height);
    }
    else if (this._orientation == 'vertical') {
        ctx.translate(0.0, this.height);
        ctx.rotate(-Math.PI / 2.0);
        ctx.drawImage(this._backImg, y, x, this.height, this.width);
    }
    
    ctx.restore();
}

