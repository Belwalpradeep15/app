/*
#  map_gmap_impl.js
#  panoptes
#
#  Created by Steven W. Klassen on 2013-02-24.
#  Copyright (c) 2013 Fotech Solutions (Canada) Ltd. All rights reserved.
 
 GMap based Map implementation.
*/



// Setup the namespaces.
var fotech = (fotech ? fotech : {});
fotech.map = (fotech.map ? fotech.map : {});
fotech.map.impl = (fotech.map.impl ? fotech.map.impl : {});


/**
 * Construct a GMap based Map implementation.
 */
fotech.map.impl.GMap = function(initialMapType) {
    this._gmap = null;
    this.initialMapType = initialMapType;
};


fotech.map.impl.GMap.mapTypeTranslation = {'normal':google.maps.MapTypeId.ROADMAP,
                           'satellite':google.maps.MapTypeId.SATELLITE,
                           'hybrid':google.maps.MapTypeId.HYBRID,
                           'terrain':google.maps.MapTypeId.TERRAIN};
fotech.map.impl.GMap.controlPositionTranslation = {'tr': google.maps.ControlPosition.TOP_RIGHT,
                                'tl': google.maps.ControlPosition.TOP_LEFT,
                                'br': google.maps.ControlPosition.BOTTOM_RIGHT,
                                'bl': google.maps.ControlPosition.BOTTOM_LEFT};

fotech.map.impl.GMap.prototype = {
    //basic conversions
    fromGLatLng: function(latlng){
        return new LatLon(latlng.lat(), latlng.lng());
    },
    toGLatLng: function(latlng){
        return new google.maps.LatLng(latlng.lat(), latlng.lon());
    },
    fromGBounds: function(bounds){
        return new fotech.geom.gis.Bounds([this.fromGLatLng(bounds.getSouthWest()), this.fromGLatLng(bounds.getNorthEast())]);
    },
    toGBounds: function(bounds){
        return new google.maps.LatLngBounds(this.toGLatLng(bounds.getSouthWest()), this.toGLatLng(bounds.getNorthEast()));
    },
    fromGPoint: function(point){
        return new fotech.geom.Point(point.x, point.y);
    },
    toGPoint: function(point){
        return new google.maps.Point(point.x, point.y);
    },
    getPositionFromPixel: function(p) {
        if (this._projection) {
           return this.fromGLatLng(this._projection.fromContainerPixelToLatLng(this.toGPoint(p)));
        }
        else {
            console.log("getPositionFromPixel - Google map implementation not yet fully loaded.  Projection is null");
            return null;
        }
    },
    getPixelFromPosition: function(latlng) {
        if (this._projection) {
            return this.fromGPoint(this._projection.fromLatLngToContainerPixel(this.toGLatLng(latlng)));
        }
        else {
            console.log("getPixelFromPosition - Google map implementation not yet fully loaded.  Projection is null");
            return null;
        }

        //return this.fromGPoint(this._gmap.getProjection().fromLatLngToContainerPixel(this.toGLatLng(latlng)));
    },
    fitBounds: function(bounds){
        this._gmap.fitBounds(this.toGBounds(bounds));
    },
    getBoundsZoomLevel: function(bounds){
        var mapType = this._gmap.mapTypes.get( this._gmap.getMapTypeId());
        var MAX_ZOOM = mapType.maxZoom || 21 ;
        var MIN_ZOOM = mapType.minZoom || 0 ;

        var gBounds = this.toGBounds(bounds);
        var ne= mapType.projection.fromLatLngToPoint( gBounds.getNorthEast() );
        var sw= mapType.projection.fromLatLngToPoint( gBounds.getSouthWest() ); 

        var worldCoordWidth = Math.abs(ne.x-sw.x);
        var worldCoordHeight = Math.abs(ne.y-sw.y);

        //Fit padding in pixels 
        var FIT_PAD = 40;
  
        for( var zoom = MAX_ZOOM; zoom >= MIN_ZOOM; --zoom ){ 
            if( worldCoordWidth*(1<<zoom)+2*FIT_PAD < this._gmap.getDiv().getWidth() && 
                worldCoordHeight*(1<<zoom)+2*FIT_PAD < this._gmap.getDiv().getHeight() )
                return zoom;
        }
        return 0;
    },
    isCompatible: function(){
        return true;
    },

    setCenter: function(position, zoom){
        this._gmap.setCenter(this.toGLatLng(position));
        this._gmap.setZoom(zoom);
    },
    getCenter: function(){
        return this.fromGLatLng(this._gmap.getCenter());
    },
    getZoom: function(){
        return this._gmap.getZoom();
    },

    setMapType: function(maptype){
        this._gmap.setMapTypeId(fotech.map.impl.GMap.mapTypeTranslation[maptype]);
    },

    render: function(el){
        this.elId = el.id;
        this._gmap = new google.maps.Map($(el), {
            streetViewControl:false,
            zoom:3,
            center:new google.maps.LatLng(0,0),
            mapTypeId: this.initialMapType});

        this._setupProjection();
       // google.maps.event.addListener(this._gmap, 'bounds_changed', function(){
       //     Event.fire(window, "fotech:mapChanged");
       // });
        google.maps.event.addListener(this._gmap, 'idle', function(){
            Event.fire(window, "fotech:mapChanged");
        });
    },
    _setupProjection: function(){

        MyOverlay.prototype = new google.maps.OverlayView();
        MyOverlay.prototype.onAdd = function() { }
        MyOverlay.prototype.onRemove = function() { }
        MyOverlay.prototype.draw = function() { }
        function MyOverlay(map) { this.setMap(map); }

        var overlay = new MyOverlay(this._gmap);
        this._projection = null;

// Wait for idle map
        google.maps.event.addListener(this._gmap, 'idle', function() {
            this._projection = overlay.getProjection();
        }.bind(this))
    },
    getProjection: function(){
        return this._projection;
    },

    _initDragZoom: function(pe){
        if (typeof(DragZoomControl) == 'undefined') {   // Google stuff is not done loading.
            if (!pe) {
                new PeriodicalExecuter(this._initDragZoom.bind(this), 1);
            }
            return;
        }

        if (pe)
            pe.stop();
    
        var otherOpts = { 
            buttonHTML: "<img title='Drag Zoom In' src='/images/fotech/mapping/zoom-button.png'/>",
            buttonStyle: { background: 'none' },
            buttonZoomingHTML: "<img title='Drag Zoom In' src='/images/fotech/mapping/zoom-button.png' class='selected'/>",
            buttonStartingStyle: { width: '24px', height: '24px'},
            backButtonHTML: "<img title='Zoom Back Out' src='/images/fotech/mapping/zoomout-button.png'>",  
            backButtonStyle: {display:'none',marginTop:'5px',width:'24px', height:'24px'},
            backButtonEnabled: true
        };

    },

    closeInfoWindow: function() {
        this._gmap.closeInfoWindow();
    },
    addDomListener: function(eventType, listener){
        $(this.elId).observe(eventType, listener);
    },
    addListener: function(overlay, eventType, listener) {
        var theObject = overlay._impl._gmap || overlay._impl;
        if(['click','dblclick'].include(eventType)){
            var wrappedListener = function(ev){
                listener(this.fromGLatLng(ev.latLng));
            }.bind(this);
            return google.maps.event.addListener(theObject, eventType, wrappedListener);
        }
        return google.maps.event.addListener(theObject, eventType, listener);
    },

    clearListeners: function(overlay, eventType){
        var theObject = overlay._impl._gmap || overlay._impl;
        google.maps.event.clearListeners(theObject, eventType);
    },
 
    newMarker: function(latlng, image, label, options) {
        return new fotech.map.impl.GMap.Marker(this, latlng, image,label,options);
    },
    newLineOverlay: function(points, colour, width, opacity,options) {
        return new fotech.map.impl.GMap.LineOverlay(this, points, colour, width, opacity,options);
    },

    newImageOverlay: function(imageURL, bounds) {
        console.log("** Google maps - no implementation for newImageOverlay **");
        return null;
    },

    addOverlay: function(overlay) {
        if (!this._gmap || !overlay || !overlay._impl)
            return;
    
        overlay._impl.setMap(this._gmap);
    },
    removeOverlay: function(overlay) {
        if (this._gmap && overlay)
            overlay._impl.setMap(null);
    },
    addControl: function(control,position,height,width){
        var g = control;
        g.initialize(this.parent);
        position = position || g._getDefaultPosition().position;
        var p = fotech.map.impl.GMap.controlPositionTranslation[position];
        this._gmap.controls[p].push(control.container)
    },

    showControls: function(){
        this._gmap.showControls();
    },

    hideControls: function(){
        this._gmap.hideControls();
        //this.dragZoomControl.resetDragZoom_();  //kills the dragzoom if it was initiated
    },

    saveMapContext: function(){

    }
};

/**
 * Construct an icon based marker overlay. If image is not specified a default icon
 * will be used.
 */
fotech.map.impl.GMap.Marker = function(map, latlng, image,label, options) {
    options = options || {};
    this._map = map;
    this._impl = new google.maps.Marker($H(options).merge({
        position: this._map.toGLatLng(latlng),
        map: map._impl,
        icon: image,
        title: label
    }).toObject());
};

fotech.map.impl.GMap.Marker.prototype = {
    getPosition: function() {
        return this._map.fromGLatLng(this._impl.position);
    },

    // Move the marker.
    setPosition: function(p) {
        this._impl.setLatLng(this._map.toGLatLng(p));
    },

    show: function(){
        this._impl.setVisible(true);
    },

    hide: function(){
        this._impl.setVisible(false);
    },

    draggable: function(enable) {
        this._impl.setDraggable(enable);
    }
};

/**
 * Construct a line based overlay.
 */
fotech.map.impl.GMap.LineOverlay = function(map, points, colour, width, opacity, options) {
    this._map = map;

    this._style = { "colour": colour,
        "opacity": opacity,
        "width": width };
    this._impl = new google.maps.Polyline($H(options).merge({
        path: points.collect(this._map.toGLatLng.bind(this)),
        strokeColor: colour,
        strokeOpacity: opacity,
        strokeWeight: width
  }).toObject());
}

// Return the bounds of the line.
fotech.map.impl.GMap.LineOverlay.prototype = {
    getBounds: function() {
        var bounds = new google.maps.LatLngBounds();
        this._impl.getPath().forEach(function(e) {
            bounds.extend(e);
        });
        return this._map.fromGBounds(bounds);
    },

    setStyle: function(options) {
        var imp_options = {};
        if (typeof options.colour != "undefined") imp_options.strokeColor = options.colour;
        if (typeof options.width != "undefined") imp_options.strokeWeight = options.width;
        if (typeof options.opacity != "undefined") imp_options.strokeOpacity = options.opacity;
        this._impl.setOptions(imp_options);
    },

    resetStyle: function() {
        this.setStyle(this._style);
    }

};




