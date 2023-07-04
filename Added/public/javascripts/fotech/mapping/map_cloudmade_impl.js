/*
#  map_cloudmap_impl.js
#  panoptes
#
#  Created by Steven W. Klassen on 2013-02-24.
#  Copyright (c) 2013 Fotech Solutions (Canada) Ltd. All rights reserved.

 Cloudmap implementation of our Map api.
*/


// Setup the namespaces.
var fotech = (fotech ? fotech : {});
fotech.map = (fotech.map ? fotech.map : {});
fotech.map.impl = (fotech.map.impl ? fotech.map.impl : {});


/**
 * Construct a Cloudmade based Map implementation.
 */
fotech.map.impl.Cloudmade = function(layers, defaultLayerType) {
    this._cmap = null;
    this.controls = [];
    this._layerHash = layers;
    this._defaultLayerType = defaultLayerType;
}

//Conversions---------------------------------------------------------------------------------------

fotech.map.impl.Cloudmade.mapTypeTranslation = {};
fotech.map.impl.Cloudmade.controlPositionTranslation = {'tr': CM.TOP_RIGHT,
                                'tl': CM.TOP_LEFT,
                                'br': CM.BOTTOM_RIGHT,
                                'bl': CM.BOTTOM_LEFT};

fotech.map.impl.Cloudmade.prototype = {
    fromCMLatLng: function(latlng){
        return new LatLon(latlng.lat(), latlng.lng());
    },
    toCMLatLng: function(latlng){
        return new CM.LatLng(latlng.lat(), latlng.lon());
    },
    fromCMBounds: function(bounds){
        return new fotech.geom.gis.Bounds([this.fromCMLatLng(bounds.getSouthWest()), this.fromCMLatLng(bounds.getNorthEast())]);
    },
    toCMBounds: function(bounds){
        return new CM.LatLngBounds(this.toCMLatLng(bounds.southwest), this.toCMLatLng(bounds.northeast));
    },

    //Setup-----------------------------------------------------------------------------------------------
    isCompatible: function(){
        return true;
    },
    render: function(el){
        this.setupTileLayers();
        var defaultLayer = fotech.map.impl.Cloudmade.mapTypeTranslation[this._defaultLayerType];
        this._cmap = new CM.Map(el.id, defaultLayer);
        $H(fotech.map.impl.Cloudmade.mapTypeTranslation).values().sortBy(function(x){return x.title}).each(function(layer){
            if(layer == defaultLayer)
                return;
            this._cmap.addTileLayer(layer);
        }.bind(this))
        this.addControl(new CM.LargeMapControl());
        this.addControl(new CM.ScaleControl());
        this.addControl(new CM.TileLayerControl());
    },
    setupTileLayers: function(){
        $H(this._layerHash).each(function(pair){
            var type = pair.key;
            var layerInfo = pair.value;
            var urlTemplate = layerInfo.tile_url_template;
            urlTemplate = urlTemplate.gsub(/\{/,"#{");
            urlTemplate = urlTemplate.gsub(/\{s\}/,"{subdomain}");
            urlTemplate = urlTemplate.gsub(/\{z\}/,"{zoom}");
            var layer = new CM.Tiles.Base({
                tileUrlTemplate: urlTemplate,
                subdomains: layerInfo.subdomains,
                copyright: layerInfo.attribution,
                title: layerInfo.title
                });
            fotech.map.impl.Cloudmade.mapTypeTranslation[pair.key] = layer;
        }.bind(this));
    },

    _initDragZoom: function(){
        //not implemented since we can just shift click/drag to zoom
        // check enable drag zoom http://developers.cloudmade.com/wiki/5/CMMap
    },   

    saveMapContext: function(){
    },
    setMapType: function(mapTypeString){
        var tileLayer = fotech.map.impl.Cloudmade.mapTypeTranslations[mapTypeString];
        if(tileLayer){
            this._cmap.setTileLayer(tileLayer);
        }   
    },
    _logWarning: function(name) {
        console.log("TODO: Cloudmap implementation not completed [" + name + "]");
    },

    //Getters/Setters------------------------------------------------------------------------------------
    setCenter: function(position,zoom) {
        this._cmap.setCenter(this.toCMLatLng(position), zoom);
    },
    getCenter: function() {
        return this.fromCMLatLng(this._cmap.getCenter());
    },
    getZoom: function(){
        return this._cmap.getZoom();
    },
    getBoundsZoomLevel: function(bounds){
        return this._cmap.getBoundsZoomLevel(this.toCMBounds(bounds));
    },
    getPositionFromPixel: function(point) {
        return this.fromCMLatLng(this._cmap.fromContainerPixelToLatLng(new CM.Point(point.x, point.y)));
    },
    getPixelFromPosition: function(latlng) {
        var pnt = this._cmap.fromLatLngToContainerPixel(this.toCMLatLng(latlng));
        return new fotech.geom.Point(pnt.x, pnt.y)
    },

    //Info window--------------------------------------------------------------------------------------------
    closeInfoWindow: function() {
        this._logWarning("closeInfoWindow");
    },

    //Controls-----------------------------------------------------------------------------------------
    addControl: function(control,position,height,width){
        var pos = fotech.map.impl.Cloudmade.controlPositionTranslation[position];
        if(!control.getDefaultPosition){
            if(pos){
                control.getDefaultPosition = function(){
                    return new CM.ControlPosition(pos, new CM.Size(height, width));
                };
            }
            else {
                control.getDefaultPosition = function(){
                    var info = this._getDefaultPosition()
                    var thePos = fotech.map.impl.Cloudmade.controlPositionTranslation[info.position];
                    return new CM.ControlPosition(thePos, new CM.Size(info.x, info.y));
                }
            }
        }
        if(pos){
            this.controls[control] = new CM.controlPosition(pos, new CM.size(height,width));
            this._cmap.addControl(control, new CM.ControlPosition(pos, new CM.Size(height, width)));
        }
        else {
            this.controls[control] = null;
            this._cmap.addControl(control);
        }
    },
    removeControl: function(control){
        this._cmap.removeControl(control);
    },
    hideControls: function(){
        $H(this.controls).keys().each(this.removeControl.bind(this));
    },
    showControls: function(){
        $H(this.controls).keys().each(function(control){
            this.cmap.addControl(control, this.controls[control]);
        }.bind(this));
    },

    //Listeners---------------------------------------------------------------------------------------------
    addListener: function(overlay, eventType, listener) {
        var theObject = overlay._impl;
        if(theObject == this){
           theObject = this._cmap;
        }
        if(['click','dblclick'].include(eventType)){
            var wrappedListener = function(latlng){
                listener(this.fromCMLatLng(latlng));
            }.bind(this);
            CM.Event.addListener(theObject, eventType, wrappedListener);
        }
        else{
            CM.Event.addListener(theObject, eventType,listener);
        }
    },
    clearListeners: function(overlay, eventType, listener){
        var theObject = overlay._impl;
        if(theObject == this){
            theObject = this._cmap;
        }
        CM.Event.removeListener(theObject,eventType,listener);
    },

    //Overlays------------------------------------------------------------------------------------------------
    newMarker: function(latlng, image,label,options) {
        return new fotech.map.impl.Cloudmade.Marker(this, latlng, image,label,options);
    },
    newLineOverlay: function(points, colour, width, opacity) {
        return new fotech.map.impl.Cloudmade.LineOverlay(this, points,colour,width,opacity);
    },
    addOverlay: function(overlay) {
        if (overlay)
            this._cmap.addOverlay(overlay._impl);
    },
    removeOverlay: function(overlay) {
        if (overlay)
            this._cmap.removeOverlay(overlay._impl);
    }
}

/********************************************************************************************************
 * Construct an icon based marker overlay.
 */
fotech.map.impl.Cloudmade.Marker = function(map, latlng, image,label, options) {
    options = options || {};
    this._map = map;
    var markerOpts = $H(options).merge({icon:new CM.Icon(CM.DEFAULT_ICON , image), title:label}).toObject()
    this._impl = new CM.Marker(map.toCMLatLng(latlng),markerOpts );
}

// Return the position of the marker.
fotech.map.impl.Cloudmade.Marker.prototype = {
    getPosition: function() {
        return this._map.fromCMLatLng(this._impl.getLatLng());
    },

// Move the marker.
    setPosition: function(p) {
        this._impl.setLatLng(this._map.toCMLatLng(p));
    },

    show: function(){
        this._impl.show();
    },

    hide: function(){
        this._impl.hide();
    }
}

/***********************************************************************************************
 * Construct a line based overlay.
 */
fotech.map.impl.Cloudmade.LineOverlay = function(map, points, colour, width, opacity) {
    this._map = map;
    this._impl = new CM.Polyline(points.collect(map.toCMLatLng.bind(map)), colour, width, opacity)
}

// Return the bounds of the line.
fotech.map.impl.Cloudmade.LineOverlay.prototype = {
    getBounds: function() {
        return this._map.fromCMBounds(this._impl.getBounds());
    }
}





