/*
#  map_leaflet_impl.js
#  panoptes
#
#  Created by Karina Simard on 2013-04-01.
#  Copyright (c) 2013 Fotech Solutions (Canada) Ltd. All rights reserved.

 Leaflet implementation of our Map api.
*/


// Setup the namespaces.
var fotech = (fotech ? fotech : {});
fotech.map = (fotech.map ? fotech.map : {});
fotech.map.impl = (fotech.map.impl ? fotech.map.impl : {});


/**
 * Construct a Leaflet based Map implementation.
 */
fotech.map.impl.Leaflet = function(layerHash, defaultLayerType, options) {
    this._lmap = null;
    this._layerHash = layerHash;
    this._defaultLayerType = defaultLayerType;
    this._options = options || {};
    this.controls = [];
};

//Conversions---------------------------------------------------------------------------------------

fotech.map.impl.Leaflet.mapTypeTranslation = {};
fotech.map.impl.Leaflet.controlPositionTranslation = {'tr': 'topright',
                                'tl': 'topleft',
                                'br': 'bottomright',
                                'bl': 'bottomleft'};

fotech.map.impl.Leaflet.prototype = {
    fromLLatLng: function(latlng){
        return new LatLon(latlng.lat, latlng.lng);
    },
    toLLatLng: function(latlng){
        return new L.LatLng(latlng.lat(), latlng.lon());
    },
    fromLBounds: function(bounds){
        return new fotech.geom.gis.Bounds([this.fromLLatLng(bounds.getSouthWest()), this.fromLLatLng(bounds.getNorthEast())]);
    },
    toLBounds: function(bounds){
        return new L.LatLngBounds(this.toLLatLng(bounds.southwest), this.toLLatLng(bounds.northeast));
    },

    //Setup-----------------------------------------------------------------------------------------------
    isCompatible: function(){
        return true;
    },
    render: function(el){
        // TODO:  this is a clumsy approach,
        if (this._options.display == "static image") {
            this._lmap = L.map(el.id, {
                maxZoom: 15,
                minZoom: 1,
                zoomSnap: .25,
                crs: this._aspectRatioCRS(this._options.width, this._options.height)
            });
        }
        else {
            this.setupTileLayers();
            var defaultLayer = fotech.map.impl.Leaflet.mapTypeTranslation[this._defaultLayerType];

            // Prepare the overlays to be added to the map, these will be shown by default. Overlays are the
            // toggleable options from the control menu
            var overlays = {};
            for (var n in this.parent._overlays) {
                if (this.parent._overlays.hasOwnProperty(n)) {
                    overlays[this.parent._overlays[n].getControlLabel()] = this._prepareOverlayLayer(this.parent._overlays[n]);
                }
            }

            this._lmap = new L.Map(el.id, {
                layers: [fotech.map.impl.Leaflet.mapTypeTranslation[this._defaultLayerType]].concat(Object.values(overlays)),
                center: [51.505, -0.09],
                zoom: 13
            });

            var baseMaps = {};
            baseMaps[defaultLayer.options.title] = defaultLayer;
            $H(fotech.map.impl.Leaflet.mapTypeTranslation).values().sortBy(function (x) {
                return x.options.title
            }).each(function (layer) {
                if (layer == defaultLayer)
                    return;
                baseMaps[layer.options.title] = layer;
            });

            L.control.layers(baseMaps, overlays).addTo(this._lmap);
            L.control.scale().addTo(this._lmap);
        }

        this._lmap.on('move', function () {
            Event.fire(window, "fotech:mapChanged");
        });

        Event.fire(window, "fotech:mapChanged");
    },
    
    _newTileLayer: function(configEntry) {
        var key = configEntry.key;
        var layerInfo = configEntry.value;
        var protocol = layerInfo.fotech_protocol;
        if (protocol == "wms") {
            return L.tileLayer.wms(layerInfo.tile_url_template, layerInfo);
        } else {
            return new L.TileLayer(layerInfo.tile_url_template, layerInfo);
        }
    },
    setupTileLayers: function(){
        $H(this._layerHash).each(function(pair){
            fotech.map.impl.Leaflet.mapTypeTranslation[pair.key] = this._newTileLayer(pair);
        }.bind(this));
    },

    _initDragZoom: function(){
        //not implemented since we can just shift click/drag to zoom
    },   

    saveMapContext: function(){
    },
    setMapType: function(mapTypeString){
         //functionality does not appear to be available;
    },
    _logWarning: function(name) {
        console.log("TODO: Leaflet implementation not completed [" + name + "]");
    },

    _aspectRatioCRS : function(width, height) {
        /*
         * A simple CRS that maps longitude and latitude into `x` and `y` directly,
         * but observes the aspect ratio of the static image overlay
         * May be used for maps of flat surfaces (e.g. game maps). Note that the `y`
         * axis should still be inverted (going from bottom to top). `distance()` returns
         * simple euclidean distance.
         */
        var aspect = height / width;
        var aspect2 = aspect * aspect;

        return  L.extend({}, L.CRS, {
            projection: L.Projection.LonLat,
            transformation: new L.Transformation(1, 0, - (aspect), 0),

            scale: function (zoom) {
                return Math.pow(2, zoom);
            },

            zoom: function (scale) {
                return Math.log(scale) / Math.LN2;
            },

            distance: function (latlng1, latlng2) {
                var dx = latlng2.lng - latlng1.lng,
                    dy = latlng2.lat - latlng1.lat;

                return Math.sqrt(dx * dx + dy * dy * aspect2);
            },

            infinite: true
        });
    },

    //Getters/Setters------------------------------------------------------------------------------------
    setCenter: function(position,zoom) {
        this._lmap.setView(this.toLLatLng(position), zoom || this._lmap.getZoom());
    },
    getCenter: function() {
        return this.fromLLatLng(this._lmap.getCenter());
    },
    getZoom: function(){
        return this._lmap.getZoom();
    },
    getBoundsZoomLevel: function(bounds){
        return this._lmap.getBoundsZoom(this.toLBounds(bounds));
    },
    getPositionFromPixel: function(point) {
        return this.fromLLatLng(this._lmap.containerPointToLatLng(new L.Point(point.x, point.y)));
    },
    getPixelFromPosition: function(latlng) {
        var pnt = this._lmap.latLngToContainerPoint(this.toLLatLng(latlng));
        return new fotech.geom.Point(pnt.x, pnt.y)
    },

    //Info window--------------------------------------------------------------------------------------------
    closeInfoWindow: function() {
        this._logWarning("closeInfoWindow");
    },

    //Controls-----------------------------------------------------------------------------------------
    addControl: function(control,position,height,width){
        control._fotechmap = control._map;
        control._map = null;
        var l = new L.Control();
        for(var prop in l){
            if(!control[prop]){
                control[prop] = l[prop];
            }
        }
        control.initialize(this.parent);
        position = position || control._getDefaultPosition().position;
        var pos = fotech.map.impl.Leaflet.controlPositionTranslation[position];
        control.options = control.options || {};
        if(pos){
            control.options.position = pos;
        }{
            
        }
        control.onAdd = function(){return this.container};

        this.controls.push(control);
        this._lmap.addControl(control);
    },
    removeControl: function(control){
        this._lmap.removeControl(control);
    },
    hideControls: function(){
    },
    showControls: function(){
    },


    //Listeners---------------------------------------------------------------------------------------------
    addListener: function(overlay, eventType, listener) {
        var theObject = overlay._impl;
        if(theObject == this){
           theObject = this._lmap;
        }
        if(['click','dblclick','mousedown','mouseover','mouseout'].include(eventType)){
            var wrappedListener = function(ev){
                listener(this.fromLLatLng(ev.latlng || ev.target.getLatLng()));
                L.DomEvent.stopPropagation(ev);
            }.bind(this);
            theObject.on(eventType, wrappedListener);
        }
        else{
            theObject.on(eventType,listener);
        }
    },
    clearListeners: function(overlay, eventType){
        var theObject = overlay._impl;
        if(theObject == this){
            theObject = this._lmap;
        }
        theObject.off(eventType);
    },

    //Overlays------------------------------------------------------------------------------------------------
    newMarker: function(latlng, image,label,options) {
        return new fotech.map.impl.Leaflet.Marker(this, latlng, image,label,options);
    },
    newLineOverlay: function(points, colour, width, opacity, options) {
        return new fotech.map.impl.Leaflet.LineOverlay(this, points,colour,width,opacity, options);
    },
    newImageOverlay: function(imageURL, bounds, options) {
        return new fotech.map.impl.Leaflet.ImageOverlay(this, imageURL, bounds, options);
    },
    addOverlay: function(overlay) {
        if (overlay && this._lmap){
            /* some items are composed of multiple lines / images etc, these additional parts
             * are callled "extras", so we need to add those to the layer too */
            if ( overlay._extras ){
                overlay._extras.forEach( function(extra){
                        this._lmap.addLayer( extra );
                }.bind(this) );
            }
            this._lmap.addLayer(overlay._impl);
        }
    },
    removeOverlay: function(overlay) {
        if (overlay && this._lmap){
            /* some items are composed of multiple lines / images etc, these additional parts
             * are callled "extras", so we need to add those to the layer too */

            if ( overlay._extras ){
                overlay._extras.forEach( function(extra){
                        this._lmap.removeLayer( extra );
                }.bind(this) );
                overlay._extras.length = 0;
            }
            this._lmap.removeLayer(overlay._impl);
        }
    },

    _prepareOverlayLayer: function(layer) {
        if (!layer) return null;

        // If we have a fotech container than we need to "render" it to get the poly lines back
        if (typeof layer.render == "function") {
            layer = layer.render();
        }

        // With an array of mapping layers (poly objects) add them to a layer group for toggling
        if (layer instanceof Array)
            return new L.LayerGroup(
                layer.map(
                    function(v) {
                        return v._impl;
                    }
                )
            );

        return null;
    }

};

/********************************************************************************************************
 * Construct an icon based marker overlay.
 */

var __unique_id = 0;

fotech.map.impl.Leaflet.Marker = function(map, latlng, image,label, options) {
    options = options || {};
    this._map = map;
    var markerOpts = $H(options).merge({title:label}).toObject();
    /* Now create the marker icon */
    markerOpts.className = markerOpts.className !== undefined ? markerOpts.className : '';

    /* Create a throbber, to draw attention to our marker */
    var markerName = "my-icon" + __unique_id ++ ;

    /* Create a background div to contain the icon */
    var iconContainer = new L.DivIcon({
        iconSize: [20, 20],
        iconAnchor: [10, 34],
        popupAnchor: [10, 0],
        shadowSize: [0, 0],
        className: markerName
    });

    var icon = new L.Marker(map.toLLatLng(latlng),
        $H(options).merge({
            title: label,
            icon: iconContainer
        }).toObject()
    );

    var className = markerOpts.className;
    var level = "level_" + markerOpts.level;

    icon._marker = {
        className: className,
        level: level,
        name:   markerName,
        image: image
    };

    icon.on('add', this.build );
    icon.on('remove', this.teardown );

    /*
    if(image){
        var icon = L.icon({iconUrl: image,
            iconSize:     [16,16],
            iconAnchor:   [8, 16]
        });
        markerOpts = $H(markerOpts).merge({icon: icon}).toObject()
    }*/

    if ( markerOpts.throb ){
        var throbberIcon = new L.DivIcon({
            iconSize: [20, 20],
            iconAnchor: [10, 10],
            popupAnchor: [10, 0],
            shadowSize: [0, 0],
            className: 'animated-icon level_' + markerOpts.level
        });

        var throbber = new L.Marker(map.toLLatLng(latlng), {
            icon: throbberIcon
        });

        this._extras = [ throbber ];
    }

    //this._impl = new L.Marker(map.toLLatLng(latlng),markerOpts );
    this._impl = icon;
};

// Return the position of the marker.
fotech.map.impl.Leaflet.Marker.prototype = {
    getPosition: function() {
        return this._map.fromLLatLng(this._impl.getLatLng());
    },

// Move the marker.
    setPosition: function(p) {
        this._impl.setLatLng(this._map.toLLatLng(p));
    },

    show: function(){
        this._map.addOverlay(this);
    },

    hide: function(){
        this._map.removeOverlay(this);
    },

    draggable: function(enable) {
        if (enable)
            this._impl.dragging.enable();
        else
            this._impl.dragging.disable();
    },

    build: function(){
        var myIcon = document.querySelector('.' + this._marker.name);

        if ( !myIcon ){
            /* The icon we are looking for isn't present, this is worrysome however
             * it might have been legitimately deleted in the time it took us to
             * draw it.  in which case we'll just have to give up */
            return;
        }
        /* repopulate the marker body if it has been destroyed, this allows us to
         * keep the memory footprint light (by destroying stuff) and still work */
        this._marker.body = this._marker.body
                            ? this._marker.body
                            : new Element( 'div', { className: 'fotech-marker-body fa fa-map-marker ' + this._marker.className + ' ' + this._marker.level } );

        this._marker.shadow = this._marker.shadow
                            ? this._marker.shadow
                            : new Element( 'div', { className: 'fotech-marker-shadow fa fa-map-marker' } );

        this._marker.licon = this._marker.licon
                            ? this._marker.licon
                            : new Element( 'div', { className: 'fotech-marker-icon' });

        /* We need to add several elements to our marker */
        this._marker.licon.style.backgroundImage = 'url("' + this._marker.image + '")';

        myIcon.appendChild( this._marker.shadow );
        myIcon.appendChild( this._marker.body );
        myIcon.appendChild( this._marker.licon );

        L.DomUtil.toFront( myIcon );
    },

    teardown: function(){
        var myIcon = document.querySelector('.' + this._marker.name);

        delete this._marker.shadow; this._marker.shadow = null;
        delete this._marker.body;   this._marker.body = null;
        delete this._marker.licon;  this._marker.licon = null;
    }
};

/***********************************************************************************************
 * Construct a line based overlay.
 */
fotech.map.impl.Leaflet.LineOverlay = function(map, points, colour, width, opacity, options) {
    options = options ? options : {};

    this._map = map;

    this._style = {
                    "color": colour,
                    "weight": width,
                    "opacity":opacity,
                    "className": "fotech vidi " + options.context,
                    "bubblingMouseEvents": true
                };

    /* There are two styles of line we want to add, those with shadows and those
     * without, those without are to remain narrow and harder to click, but considering
     * we never want to click them, that's OK.  Check our options to see if we
     * want shadow lines or not */

     if ( !options.shadow ){
        this._impl = new L.Polyline(
                            points.collect(map.toLLatLng.bind(map)),
                            this._style
                    );

        return;
     }


    /* Create the initial Line, this line is usually rendered invisibly, but will
     * capture mouse events etc, and is wider than the visible line to make interacting
     * with it easier. */

    var shadow = new L.Polyline(
                        points.collect(map.toLLatLng.bind(map)),
                        { color: '#0099ff', weight: ( width * 3 ), opacity: 0, className: "fotech shadow " + options.context  }
                 );

    /* now create an "extra" line which is to be rendered in addition to this line
     * this one will be visible and be allowed to have it's style manipulated */
    var visible = new L.Polyline(
                        points.collect(map.toLLatLng.bind(map)),
                        this._style
                  );

    /* Add some simple event listeners to the shadow line, which highlight when you're
     * over it etc */

    shadow.addEventListener( "mouseover",
                            function(e){
                                this.setStyle( { opacity: 0.3 } );
                            }
                           );

    shadow.addEventListener( "mouseout",
                            function(e){
                                this.setStyle( { opacity: 0 } );
                            }
                           );

    /* Now, add these lines to our line type */
    this._impl = shadow;
    this._extras = [ visible ];
};

// Return the bounds of the line.
fotech.map.impl.Leaflet.LineOverlay.prototype = {
    getBounds: function() {
        return this._map.fromLBounds(this._impl.getBounds());
    },

    setStyle: function(options) {
        var imp_options = {};
        if (typeof options.colour != "undefined") imp_options.color = options.colour;
        if (typeof options.width != "undefined") imp_options.weight = options.width;
        if (typeof options.opacity != "undefined") imp_options.opacity = options.opacity;

        /* if we have any "extras" then these are items which are actually visible, rather than
         * the underlying _impl object, which is probably invisible and slightly oversized to
         * make it easier to interact with, if this is the case, alter the styling of those
         * elements and not the _impl one */

        if ( this._extras ){
            this._extras.forEach( function( el ){
                    el.setStyle( imp_options );
            } );
        } else {
            /* Set the styling of the base element instead */
            this._impl.setStyle(imp_options);
        }
    },

    resetStyle: function() {
        this._impl.setStyle(this._style);
    }

};

/***********************************************************************************************
 * Construct a image based overlay.
 */
fotech.map.impl.Leaflet.ImageOverlay = function(map, imageURL, bounds, options) {
    options = options ? options : {};
    this._map = map;
    this._impl = new L.imageOverlay(imageURL, bounds);
};