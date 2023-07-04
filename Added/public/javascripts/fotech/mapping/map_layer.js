/*
 * FILENAME:    map_layer.js
 * AUTHOR:      Arunas
 * CREATED ON:  2016-09-13
 *
 * DESCRIPTION:
 *
 * An interface and wrapper for map layers, the idea is that we should not
 * be building map layers outside of the context of the map itself.  So rather than
 * telling the map "here's our layer", we instead ask the map to give us a layer that's
 * already sized, and has events connected etc.
 *
 * NOTE:  this object actively looks after deferring rendering of the added overlay object
 *        until the map has been rendered.   So you can add markers and polylines, and they
 *        will be added to the map in the .render method
 *
 * LAST CHANGE:
 * $Author: $
 *   $Date: $
 *    $Rev: $
 *    $URL: $
 *
 * COPYRIGHT:
 * This file is Copyright © 2016 Fotech Solutions Ltd. All rights reserved.
 */

/** Fotech namespace. */
var fotech = (fotech ? fotech : {});

/** Fotech map namespace. */
fotech.map = (fotech.map ? fotech.map : {});

fotech.map.layer = function (name, map, style) {
    this.map = map;
    this.map_ui = $(map.mapId);
    this._isVisible = true;
    this._isRendered = false;
    this._polylines = [];
    this._markers = {};
    this._toRender = [];
    this._toNotRender = []; // handling deletion before rendering
    this._layerStyle = style || "standard";
    this.map.addLayer(name, this, this._layerStyle);
    this._name = name;
    this._layerDiv = null;
    this._canvas = null;
    this._init();
    this.setBounds();
};

fotech.map.layer.prototype = {
///////////////// Public methods ///////////////////

    /**
     * unloads the polyline and disassiciates this object from the map
     * don't try to use the object after calling this!
     */
    unload: function() {
        this._hideAllOverlays(this._polylines);
        this._polylines = [];
        this.removeAllMarkers();
        this.map.removeLayer(this);
        this.map = {};
        this.map_ui = null;
    },

    show: function (shouldShow, zIndex) {
        if (this._isVisible != shouldShow) {
            if (shouldShow) {
                this._showAllOverlays(this._polylines);
                this._showAllOverlays(this._markers);
            }
            else {
                this._hideAllOverlays(this._polylines);
                this._hideAllOverlays(this._markers);
            }
        }

        this._isVisible = shouldShow;

        if (this._layerDiv) {
            if (zIndex == undefined)
                zIndex = 650; // TODO: would be nicer to force this to be on top by finding other zindex values
            this._layerDiv.style.zIndex = this._isVisible ? zIndex : -100;
            this.rePaint.bind(this).defer();
        }
    },

    /**
     * pure vitual function draw - draws element of the layer that are manually drawn.  this should be implemented by the implementor.
     *        But only implement it if you need it
     * @param context - the 2D graphics context for the class to draw upon
     */
    // draw: function(context) {},

    getPixelFrom: function(lat_lon) {
        return this.map.getPixelFromPosition(lat_lon);
    },

    /**
     * This can be over-ridden by the implementor, but updateBounds can be used instead
     * returns geom bounds object
     */
    getBounds: function() {
        return this._bounds;
    },

    /**
     * updateBounds - adds the supplied point(s) to the bounds for the layer - note that this
     *                doesn't ever shrink the bounds!  If you need to reset bounds to something
     *                potentially smaller, use 'setBounds' instead
     * @param locations
     */
    updateBounds : function(locations) {
        locations = [locations].flatten();
        if (!this._bounds) {
            this._bounds = new fotech.geom.gis.Bounds(locations);
        }
        else {
            this._bounds.extend(new fotech.geom.gis.Bounds(locations));
        }
    },

    /**
     * setBounds - sets the bounds based on the supplied point(s) - this always resets the bounds
     *             if you want to extend then, consider using updateBounds instead.
     * @param locations
     */
    setBounds : function(locations) {
        this._bounds = null;
        if (typeof locations != "undefined" && locations) {
            locations = [locations].flatten();
            this._bounds = new fotech.geom.gis.Bounds(locations);
        }
    },

    getName: function() { return this._name; },

    //////////  poly line Overlays
    /**
     * addPolyLine - adds a polyline, but may defer its creation
     * @param latlng_points
     * @param options - colour, weight, opacity etc
     * @param handlers - tt_provider, onClick,
     * @returns returns an ID that can be used to remove the polyline later
     */
    addPolyLine: function(latlng_points, options, handlers) {
        if (this._isRendered) {// we can just add directly
            return this._addPolyLine(latlng_points, options.colour, options.weight, options.opacity, handlers, options);
        }
        else { // we need to wait and render when the map is ready
            return this._toRender.push(function () {
                    return this._addPolyLine(latlng_points, options.colour, options.weight, options.opacity, handlers, options);
                 }.bind(this)) - 1;
        }
    },

    setPolyLineStyle: function(id, options) {
        this._polylines[id].setStyle(options);
    },

    resetPolyLineStyle: function(id) {
        this._polylines[id].resetStyle();
    },

    removePolyLine: function(id) {
        if (this._isRendered) {
            var pline = this._polylines[id];
            if (typeof pline != undefined && pline) {
                this.map.removeOverlay(this._polylines[id]);
                this._polylines[id] = null;
            }
        }
        else {
            if (id >= 0 && id < this._toRender.length) {
                this._toNotRender[id] = true;
            }
        }

    },

        /////////  marker overlays

    addOrUpdateMarker: function(id, name, location, icon_path, options, handlers, extra ) {
        if (this._isRendered) {// we can just add directly
            return this._addOrUpdateMarker(id, name, location, icon_path, options, handlers, extra);
        }
        else { // we need to wait and render when the map is ready
            return this._toRender.push(function () {
                    this._addOrUpdateMarker(id, name, location, icon_path, options, handlers, extra);
                }.bind(this)) - 1;
        }
    },

    removeMarker: function(id) {
        // TODO:  handle deletion before rendering has been completed
        var marker = this._markers[id];
        if (typeof marker != "undefined" && marker) {
            this.map.removeOverlay(marker);
            if ( this._markers[id]._impl ){
                delete this._markers[id]._impl;
            }
            if ( this._markers[id]._extras ){
                this._markers[id]._extras.forEach( function(e){
                    delete e;
                });
            }
            delete this._markers[id];
        }

    },

    removeAllMarkers: function() {
        this._hideAllOverlays(this._markers);
        this._markers = {};
    },

    getMarker: function(id) {
        return this._markers[id];
    },

    setMarkerDraggable: function (id, enable){
        var marker = this._markers[id];
        if (marker) {
            marker.draggable(enable);
            if (enable) {
                this.map.addListener(this._markers[id], "drag",
                    function (ev) {
                        this._onMarkerDrag(marker, ev);
                    }.bind(this));
                this.map.addListener(this._markers[id], "dragend",
                    function (ev) {
                        this._onMarkerDragend(marker, ev);
                    }.bind(this));
            }
        }
    },

    setMarkersDraggable: function(enable) {
        for (var id in this._markers) {
            if (this._markers.hasOwnProperty(id))
                this.setMarkerDraggable(id, enable);
        }
    },

    _onMarkerDrag: function(marker, full_ev) {
        Event.fire(window, "fotech:map.marker.dragged", marker);
    },

    _onMarkerDragend: function(marker, full_ev) {
        Event.fire(window, "fotech:map.marker.dragend", marker);
    },
    ///////////////////////

    addListener: function(id, eventName, handler) {
        this.map.addListener(this._polylines[id], eventName, handler);
    },

    ///////////////////////
    // callback to be called by the map when it renders
    // this handles delayed rendering of overlay elements
    render: function() {
        for (var i = 0; i < this._toRender.length; i++) {
                this._toRender[i]();
        }
        this._toRender = [];
        this._isRendered = true;

        for (var i = 0; i < this._toNotRender.length; i++) {
            if (this._toNotRender[i])
                this.removePolyLine(i);
        }
        this._toNotRender = [];
    },


    /**
     * queues up a paint request.  Once the map is idle, and painting can be handled,
     * extra request are discarded - and only one paint is done.
     * @param force
     */
    rePaint : function(force) {
        if (force) {
            this._redraw();
        }
        else {
            this._paintRequests.push(this._redraw.bind(this).defer());
        }
    },

//////////////////// private methods /////////////////////////
    _init: function () {
        if (typeof this.draw === "function") {
            this._setupLayer();
            this._setupCanvas();
            this._setupEventHandlers();
        }
    },

    /**
     * redraws the owner-drawn portion of the layer - as requested, but only once.
     * @private
     */
    _redraw: function() {
        if (this._isVisible && this._layerDiv) {
            if (this._isRendered) {
                for (var req in this._paintRequests) {
                    if (!this._paintRequests.hasOwnProperty(req)) continue;

                    window.clearTimeout(this._paintRequests[req]);
                }
                this._paintRequests = [];
                this._clear_drawing_canvas();
                this.draw(this._drawing_canvas().getContext('2d'));
            }
        }
    },

    _setupLayer: function () {
        this._layerDiv = document.createElement('div');
        this.map_ui.up().appendChild(this._layerDiv);
        this._layerDiv.style.pointerEvents = 'none';
        this._layerDiv.style.position = 'absolute';
        this._layerDiv.style.top = this.map_ui.offsetTop + this.map_ui.clientTop + 'px';
        this._layerDiv.style.left = this.map_ui.offsetLeft + this.map_ui.clientLeft +'px';
    },

    _setupCanvas: function () {
        this._canvas = new Element('canvas', {style: 'pointer-events:none; visibility:visible;'});
        this._layerDiv.appendChild(this._canvas);
        this._adjustCanvasSize();
        this._paintRequests = [];
    },

    _drawing_canvas : function() {
        return this._canvas;
    },

    _clear_drawing_canvas : function() {
        //noinspection SillyAssignmentJS
        this._canvas.width = this._canvas.width; // clear;
    },

    _adjustCanvasSize: function () {
        this._canvas.width = this.map_ui.clientWidth;
        this._canvas.height = this.map_ui.clientHeight;
    },

    _setupEventHandlers: function () {
        Event.observe(window, 'fotech:mapChanged', this.rePaint.bind(this));
        Event.observe(window, 'resize', function () {
            this._adjustCanvasSize();
            this.rePaint();
        }.bind(this));
    },

    _hideAllOverlays: function(overlays) {
        // This function can handle when overlays is either an array or a hash.
        // First we handle the array case.
        if (overlays instanceof Array) {
            for (var i = 0; i < overlays.length ; i ++) {
                 if (overlays[i]) {
                    this.map.removeOverlay(overlays[i]);
                }
            }
        }
        else if (overlays instanceof Object) {
            // Then we handle hashes (objects).
            for (key in overlays) {
                var o = overlays[key];
                if (o) {
                    this.map.removeOverlay(o);
                }
            }
        }
        else {
            // Otherwise there is nothing we can do.
            console.log("ERROR: fotech.map.layer._hideAllOverlays only accepts Arrays and Objects.");
        }
    },

    _showAllOverlays:function(overlays) {
        // This function can handle when overlays is either an array or a hash.
        // First we handle the array case.
        if (overlays instanceof Array) {
            for (var i = 0; i < overlays.length ; i ++) {
                if (overlays[i]) {
                    this._showOverlay(overlays[i]);
                }
            }
        }
        else if (overlays instanceof Object) {
            // Then we handled hashes (objects).
            for (key in overlays) {
                var o = overlays[key];
                if (o) {
                    this.map._showOverlay(o);
                }
            }
        }
        else {
            // Otherwise there is nothing we can do.
            console.log("ERROR: fotech.map.layer._showAllOverlays only accepts Arrays and Objects.");
        }
    },

    /**
     * _addPolyLine - actually adds, once the map has been rendered.
     * @param latlng_points
     * @param options
     * @param handlers  // TODO: these could be made more general
     * @private
     */
    _addPolyLine : function(latlng_points, colour, weight, opacity, handlers, options) {
        var pline_overlay = this.map.newLineOverlay(latlng_points, colour, weight, opacity, options);
        pline_overlay._fot_handlers = handlers;

        if (this._isVisible) this._showOverlay(pline_overlay);

        for (var i = 0; i < this._polylines.length ; i++) {
            if (!this._polylines[i]) {
                this._polylines[i] = pline_overlay;    // reuse a slot
                return i;
            }
        }

        this.updateBounds(latlng_points);
        // there are no empty slots.
        return this._polylines.push(pline_overlay) - 1;
    },

    _showOverlay: function(overlay) {
        this.map.addOverlay(overlay);
        var handlers = overlay._fot_handlers;
        if (typeof handlers != "undefined") {
            if (typeof (handlers.tt_provider) == "function")
                this.map.associateOverlayToolTip(overlay, handlers.tt_provider);
            if (typeof (handlers.onClick) == "function")
                this.map.associateOverlayClickHandler(overlay, handlers.onClick);
        }
    },

    _addOrUpdateMarker : function (id, name, location, icon_path, options, handlers, extra) {
        if (this._markers.hasOwnProperty(id) && this._markers[id] ) {
            if (this._isVisible)
                this.removeMarker(id);
        }
        var marker_overlay = this.map.newMarker(location, icon_path, name, options);

        this.updateBounds([location]);
        if (typeof extra != 'undefined')
            marker_overlay.extra = extra;

        marker_overlay._fot_handlers = handlers;

        if (this._isVisible) this._showOverlay(marker_overlay);

        this._markers[id] = marker_overlay;

        return marker_overlay;
    }

};
