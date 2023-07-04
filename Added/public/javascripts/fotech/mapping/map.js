/*
 * FILENAME:    map.js
 * AUTHOR:      Steven Klassen
 * CREATED ON:  2008-09-05
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
 * This file is Copyright (c) 2008 Fotech Solutions Ltd. All rights reserved.
 */

/**
 * @fileoverview Map related utilities.
 */

/** Fotech namespace. */
var fotech = (fotech ? fotech : {});

/** Fotech map namespace. */
fotech.map = (fotech.map ? fotech.map : {});


/**
 * Construct a new Map object.
 * @constructor
 * @param mapId The id of the HTML element where the map will be rendered.
 * @param options an object that must include at least 'units-distance' and 'precision-distance'
 *
 * @class
 * The Map class provides a high-level abstraction of a map based on the Google Maps API.
 */
fotech.map.Map = function (mapId, mapProvider, options, mapLayers, initialMapType) {
    this.isRendered = false;
    this.mapId = mapId;
    //   these two may be interesting for some of the layers, in particular 'on route'
    this.distanceUnits = options['units-distance'];
    this.distancePrecision = options['precision-distance'];
    this.preferences = options;
    this.drawPolyControl = null;
    this._toolTipDiv = document.createElement('div');
    $(this.mapId).up(1).insert(this._toolTipDiv);
    this._toolTipDiv.addClassName("map_tooltip");
    this._tooltips = {};
    this._showLatLon = false;
    this._mouseX = 0;
    this._mouseY = 0;

    this.dragZoomControl = null;
    this._zoomEnabled = true;

    // object for managing overlay objects.
    this._layers = {};
    this._overlays = {};

    this._offsets = $(this.mapId).cumulativeOffset();

    // Create the provider specific implementation.
    this._impl = null;
    switch(mapProvider) {
        case 'cloudmade':
            this._impl = new fotech.map.impl.Cloudmade(mapLayers, initialMapType);
            break;
        case 'google':
            this._impl = new fotech.map.impl.GMap(initialMapType);
            break;
        case 'leaflet':
            this._impl = new fotech.map.impl.Leaflet(mapLayers, initialMapType, options);
            break;
        default:
            this._impl = new fotech.map.impl.Null(mapProvider);
            break;
    }

    this.map_type = 'geospatial';

    this._impl.parent = this;

    $(mapId).observe('mousemove', function (ev) {
        this._onMouseMove(ev);
    }.bind(this));

    /* Setup click handlers for the radio boxes dictating layers */
    this.setMapLayerOnclick();

};


/**
 * These global constants evaluate true if we have a mapping API and false otherwise.
 */
fotech.map.Map._haveGoogleMapAPI = (typeof(google) != 'undefined' && typeof(google.maps) != 'undefined');
fotech.map.Map._haveCloudmadeAPI = (typeof(CM) != 'undefined');
fotech.map.Map._haveLeafletAPI = (typeof(L) != 'undefined');
fotech.map.Map.haveMapAPI = (fotech.map.Map._haveGoogleMapAPI || fotech.map.Map._haveCloudmadeAPI || fotech.map.Map._haveLeafletAPI);

fotech.map.Map.prototype = {

    getPixelFromPosition: function (latlng) {
        return this._impl.getPixelFromPosition(latlng);
    },

    getPositionFromPixel: function (point) {
        return this._impl.getPositionFromPixel(point);
    },

    setMapType: function (mapType) {
        this._impl.setMapType(mapType);
    },

    setMapLayerOnclick: function() {
            var radios = document.getElementsByName("leaflet-base-layers");
            for ( var i = 0, len = radios.length; i < len; i++ ) {
                val = radios[i].parentNode.innerText.toLowerCase().replace(/\s/g, "");
                radios[i].setAttribute("onclick", "setUserMaplayerPreference('" + val + "') ");
            }
    },

    getContainer: function () {
        return $(this.mapId);
    },
    controlPositionTranslation: function (pos) {
        return this._impl.controlPositionTranslation[pos];
    },

    /**
     * addLayer - puts the overlay into the map's collection so that it gets rendered
     * @param name - the name of the layer - used for finding it again
     * @param layer - a fotech.map.layer object
     */
    addLayer: function (name, layer, style) {
        if (style == "overlay") {
            this._overlays[name] = layer;
        } else {
            this._layers[name] = layer;
        }
        if (this.isRendered) layer.render();
    },
    /**
     * removes the named overlay from this object - doesn't actually remove any graphical
     * elements however, the overlay object is responsible for that.
     * @param name
     */
    removeLayer: function (name) {
        delete this._layers[name];
    },

    getLayer: function (name) {
        return this._layers[name];
    },

// Respond to mouse movement events by tracking our position.
    _onMouseMove: function (ev) {
        this._mouseX = ev.pageX;
        this._mouseY = ev.pageY;

        this._divX = this._mouseX - this._offsets[0];
        this._divY = this._mouseY - this._offsets[1];
    },

    mapDivPointFromViewPort: function(x, y) {
        return { x: x - this._offsets[0], y : y - this._offsets[1]};
    },

    /**
     * Add a marker to the map.
     */
    newMarker: function (location, icon, label, options) {
        options = options || {};
        var marker = this._impl.newMarker(location, icon, label, options);
        return marker;
    },

    addControl: function (control, position, height, width) {
        control.setMap(this);
        this._impl.addControl(control, position, height, width);
    },

    /// Note that 'overlays' here are the implmenentation specific poly lines, markers etc
    addOverlay: function (overlay) {
        this._impl.addOverlay(overlay);
    },
    removeOverlay: function (overlay) {
        if (overlay) {
            this._impl.clearListeners(overlay, "mouseout");
            this._impl.clearListeners(overlay, "mousemove");
            this._impl.clearListeners(overlay, "click");
            this._impl.removeOverlay(overlay);
        }
        else { console.log("map.removeOverlay - null overlay!");}
    },

    newImageOverlay: function (imageURL, bounds) {
        return this._impl.newImageOverlay(imageURL, bounds);
    },

    newLineOverlay: function (points, color, width, opacity, options) {
        return this._impl.newLineOverlay(points, color, width, opacity, options);
    },
    addNewLineOverlay: function (points, color, width, opacity, options) {
        var lol = this._impl.newLineOverlay(points, color, width, opacity, options);
        this.addOverlay(lol);
        return lol;
    },
    addListener: function (overlay, eventName, listener) {
        this._impl.addListener(overlay, eventName, listener);
    },
    clearListeners: function (overlay, eventName, listener) {
        overlay = overlay || this;
        overlay._impl.clearListeners(overlay, eventName, listener);
    },
    addDomListener: function (eventName, listener) {
        this._impl.addDomListener(eventName, listener);
    },

    //////////////////////////////
    //
    //  Tool Tips!
    //

    associateOverlayToolTip: function (overlay, tt_provider) {
        if (typeof tt_provider == "function") {
            this._impl.addListener(overlay, "mousemove", function () {
                this.showToolTip(tt_provider, overlay);
            }.bind(this));
            this._impl.addListener(overlay, "mouseout", function () {
                delete (this._tooltips).layer;
                this._hideTooltip();
            }.bind(this));
        }
    },

    showToolTip: function (tt_provider, overlay) {
        var mouseLatLng = this._impl.getPositionFromPixel({x: this._divX, y: this._divY});
        this._tooltips.layer = tt_provider(overlay, mouseLatLng);

        this._showTooltip();
        return false;
    },

    // Internal method to show a tooltip at the current mouse position.
    _showTooltip: function () {

        var msg = '';

        for (var line in this._tooltips) {
            if (this._tooltips.hasOwnProperty(line)) {
                msg += (msg.length ? '<br>' : '') + this._tooltips[line];
            }
        }
        this._toolTipDiv.update(msg);
        this._toolTipDiv.style.top = (this._mouseY - 30) + "px";
        this._toolTipDiv.style.left = (this._mouseX + 5) + "px";
        this._toolTipDiv.style.visibility = "visible";
    },

    _hideTooltip: function () {

        this._toolTipDiv.style.visibility = "hidden";
    },

    enableLatLngToolTip: function (show) {
        this._showLatLon = show;
        if (show) {
            this._impl.addListener(this, "mousemove", function () {
                this._tooltips.map = this._getLatLonDisplay();
                this._showTooltip();
            }.bind(this));
            this._impl.addListener(this, "mouseout", function () {
                delete (this._tooltips).map;
                this._hideTooltip();
            }.bind(this));
        }
        else {
            this._impl.clearListeners(this, "mousemove");
            this._impl.clearListeners(this, "mouseout");
        }
    },

    _getLatLonDisplay: function () {
        var latLng = this._impl.getPositionFromPixel({x: this._divX, y: this._divY});
        return latLng.toString(this.preferences['units-latlng'], this.preferences['precision-latlng']);
    },

    associateOverlayClickHandler: function (overlay, onClick) {
        if (typeof onClick == "function") {
            this._impl.addListener(overlay, "click", function () {
                onClick(overlay, this._impl.getPositionFromPixel({x: this._divX, y: this._divY}));
            }.bind(this));
        }
    },

    /**
     * Render the map. This should only be called once per page. Once the map has been rendered
     * it will largely maintain itself.
     * @param defaultArea if this is an integer, the map will zoom to the fibre route it corresponds to, otherwise or if nil will show the entire region
     * @throws Error if there is not at least one route or if the map has already been rendered.
     */
    render: function (defaultArea) {
        if (this.isRendered)
            throw new Error("This map has already been rendered.");
        if (!fotech.map.Map.haveMapAPI) {
            // TODO:  I'm not sure we can really do this without problems in the layers
            this.__renderWithoutMaps();
            return;
        }

        if (!this._impl.isCompatible()) {
            throw new Error("Your browser is not compatible with the currently selected map API.");
        }

        // Setup the map and position it so it displays our region of interest.
        this._impl.render(document.getElementById(this.mapId));

        this.zoomToBounds();

        // Setup the zoom control.
        this.__initDragZoomControl(null);

        // Draw the layers.
        for (var id in this._layers)
            this._layers[id].render();

        this.isRendered = true;
    },


// Setup the drag zoom control. This seems sensitive to the timing of the control's javascript
// getting loaded so we need to watch for that.
    __initDragZoomControl: function () {
        this._impl._initDragZoom();
    },


// Render the map when Maps is not available. At some point we should create a non-Map
// spatial rendering, but for now we just display the fibre line names.
    // TODO:  do we still have this need?
    __renderWithoutMaps: function () {
        var div = document.getElementById(this.mapId);
        var p = new Element("p");
        p.appendChild(document.createTextNode("The map is not currently available."));
        div.appendChild(p);

        this._fibreLineList = new Element("ul", {id: this.mapId + "_fibreLineList"});
        var li;
        for (var routeId in this.fibreRoutes) {
            li = new Element("li");
            li.appendChild(document.createTextNode(this.fibreRoutes[routeId].name));
            this._fibreLineList.appendChild(li);
        }
        div.appendChild(this._fibreLineList);
    },

    /**
     * Free the memory used by the map. The map object should not be used after calling this.
     */
    unload: function () {
        for (var id in this._layers) {
            if (this._layers.hasOwnProperty(id)) {
                this._layers[id].unload();
            }
        }
    },

    /**
     * Rezoom and recenter the map to show all the routes.
     * @throws Error if there are no non-empty fibre routes in the map.
     */
    zoomToBounds: function (bounds) {
        // Determine the bounds of all the layers that have been given so far.
        if ((typeof bounds == "undefined") || !bounds) {
            bounds = null;
            for (var id in this._layers) {
                var bnds = this._layers[id].getBounds();
                if (typeof bnds != "undefined" && bnds) {
                    if (!bounds) {
                        bounds = bnds;
                    }
                    else {
                        bounds.extend(bnds);
                    }
                }
            }
        }
        if (!bounds) {
            bounds = new fotech.geom.gis.Bounds([new LatLon(90, -180), new LatLon(-90, 180)]);
            window.console.log("There are no non-empty layers in this map.");
            return;
        }

        // Zoom and reposition the map.
        this.fitBounds(bounds);
    },

    fitBounds: function (bounds) {
        if (typeof this._impl.fitBounds == "function") {
            this._impl.fitBounds(bounds);
        }
        else {
            this.setPositionAndZoom(bounds.getCenter(), this._impl.getBoundsZoomLevel(bounds));
        }
    },

    showControls: function () {
        this._impl.showControls();
        this._zoomEnabled = true;
    },

    hideControls: function () {
        this._impl.hideControls();
        this._zoomEnabled = false;
    },

    saveContextAndZoom: function (position, zoom) {
        if (this._zoomEnabled)
            this._impl.saveMapContext();
        this.setPositionAndZoom(position, zoom);
    },

    setPositionAndZoom: function (position, zoom) {
        if (this._zoomEnabled)
            this._impl.setCenter(position, zoom);
        else
            alert('Zooming currently disabled');
    },

    getCenter: function () {
        return this._impl.getCenter();
    },

    getZoom: function () {
        return this._impl.getZoom();
    },

    menuButton: function( icon, type, options ){
        options = options ? options : {};
        /* rather than creating images, create spans as they're lighter weight and can use icons etc */

        /* we have adders and removers ... */
        var button = new Element('span', {
                                                "class": "fotech-button fa-layers fa-fw " + (options["class"] || "" ),
                                                "title": ( options.title || "" ),
                                                "id": ( options.id || "" )
                                         } );

        /* now add some nicer markers to the button */
        button.appendChild( new Element( 'i', { "class": "fas fa-" + icon } ));

        if ( type != '' ){
                /* add a marker to denote that we have some */
                var marker = new Element( 'span', { "class": "fa-layers-counter fa-layers-bottom-right" } );
                button.appendChild( marker );
                marker.appendChild( new Element( 'i', { "class": "fas fa-" + type } ));
        }

        return button;
    }
};


