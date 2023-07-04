/*
 * FILENAME:    brokenFibreMapOverlay.js
 * AUTHOR:      Karina Simard
 * CREATED ON:  2013-06-07
 * 
 * DESCRIPTION:  
 *
 * LAST CHANGE:
 * $Author: $
 *   $Date: $
 *    $Rev: $
 *    $URL: $
 *
 * COPYRIGHT:
 * This file is Copyright © 2013 Fotech Solutions Ltd. All rights reserved.
 */

fotech.map.BrokenFibreLayer = function (map, alertManager, fibreManager, options) {
    fotech.map.layer.call(this, fotech.map.BrokenFibreLayer.layer_name, map);

    this.setBounds();  // sets no bounds

    options = options || {};
    this._alertManager = alertManager;
    this._fibreManager = fibreManager;
    this._breaks = {};

    this.patternSrc = options.patternSrc || this._defaultPatternSrc();

    this.lineWidth = options.lineWidth || 10.0;

    this._setupBreakListeners();
    this.processAlerts();
};

fotech.map.BrokenFibreLayer.prototype = Object.create(fotech.map.layer.prototype);
fotech.map.BrokenFibreLayer.prototype.constructor = fotech.map.BrokenFibreLayer;

fotech.map.BrokenFibreLayer.layer_name = "brokenfibre_layer";

fotech.map.BrokenFibreLayer.prototype._defaultPatternSrc = function () {
    var patternSrc = document.createElement('canvas');
    patternSrc.height = 50;
    patternSrc.width = 50;
    var context = patternSrc.getContext("2d");
    var spacing = 5;

    for(var i= 0; i <= 50; i++){
         context.moveTo(0,(i *spacing));
         context.lineTo((i * spacing),0);
         context.moveTo(0, patternSrc.width - (i*spacing));
         context.lineTo((i*spacing), patternSrc.height)
     }
    context.alpha = 0.5;
    context.strokeStyle = "red";
    context.lineWidth = "1";
    context.lineCap = "square";
    context.stroke();

    context.translate(patternSrc.width % 2, patternSrc.height % 2 );
    return patternSrc;
};

fotech.map.BrokenFibreLayer.prototype._addBreak = function (routeId, breakPosition) {

    var fibreRoute = this._fibreManager.routes[routeId];
    if (fibreRoute) {
        if (typeof this._breaks[routeId] != 'undefined') {
            this.removePolyLine(this._breaks[routeId].overlay);
        }
        this._breaks[routeId] = { distance : breakPosition};
        this._breaks[routeId].track = fibreRoute.getLatLngsForSubsection(breakPosition);

        this.rePaint();
    }
};


fotech.map.BrokenFibreLayer.prototype._setupBreakListeners = function () {
    var callback = this.processAlerts.bind(this);
    Event.observe(fotech.gui.rootOpener().document, 'alert:add', callback);
    Event.observe(fotech.gui.rootOpener().document, 'alert:update', callback);
    Event.observe(fotech.gui.rootOpener().document, 'alert:remove', callback);
    Event.observe(fotech.gui.rootOpener().document, 'alert:removeMultiple', callback);
};

fotech.map.BrokenFibreLayer.prototype.processAlerts = function () {
    var breakAlerts = this._alertManager.getAllByAttribute('name', 'fibre_break_alert');
    breakAlerts.each(function (a) {
        if (a.showBrokenFibre) {
            return;
        }
        var fibreId = parseInt(a.details.fibre_line_id);
        var position = parseInt(a.details.position);
        this._addBreak(fibreId, position);
    }.bind(this));

    this.rePaint();
};

fotech.map.BrokenFibreLayer.prototype.draw = function (context) {

    context.lineWidth = this.lineWidth;
    pat = context.createPattern(this.patternSrc, 'repeat');
    context.strokeStyle = pat;

    context.lineCap = "round";
    for (var idx in this._breaks) {
        if (this._breaks.hasOwnProperty(idx)) {
            var pointsToDraw = this._breaks[idx].track;
            if (pointsToDraw.length) {
                //context.beginPath();
                //context.strokeStyle = pat;
                var pnt = this.getPixelFrom(pointsToDraw[0]);
                context.moveTo(pnt.x, pnt.y);
                for (var i = 1, len = pointsToDraw.length; i < len; i++) {
                    pnt = this.getPixelFrom(pointsToDraw[i]);
                    context.lineTo(pnt.x, pnt.y);
                }
                context.stroke();
            }
        }
    }
};

