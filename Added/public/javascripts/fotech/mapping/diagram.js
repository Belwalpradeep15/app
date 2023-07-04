/**
 * fotech.Diagram inherits from fotech.map.Map
 *
 *  permits layers etc to work - coordinate system is [0, 1] x [0, 1] - set LatLon positions
 *  to be based on x and y offset parameters.
 */


fotech = fotech || {};

fotech.Diagram = function(divID, options){
    options = options || {};
    options.display = "static image";

    fotech.map.Map.call(this, divID, 'leaflet', options);
    this._imageWidth = options.width;
    this._imageHeight = options.height;
    this._imageURL = options.imageURL;

    this.zoom = 1;
    this.map_type='engineering';

};

fotech.Diagram.prototype = Object.create(fotech.map.Map.prototype);
fotech.Diagram.prototype.constructor = fotech.map.Diagram;

fotech.Diagram.prototype.render = function(){
        Object.getPrototypeOf(Object.getPrototypeOf(this)).render.bind(this)();

        var imageWidth = this._imageWidth;
        var imageHeight = this._imageHeight;
        var southWest = new L.LatLng(1, 0);
        var northEast = new L.LatLng(0, 1);
        var image_bounds = new L.LatLngBounds(southWest, northEast);

        if(this.imageOverlay){
            this.removeOverlay(this.imageOverlay);
        }

        this.imageOverlay = this.newImageOverlay(this._imageURL, image_bounds );
        this.addOverlay(this.imageOverlay);

        var margin_pct = 0.05;
        southWest = new L.LatLng(  (1 + margin_pct), - margin_pct);
        northEast = new L.LatLng(-  margin_pct,  (1 + margin_pct));
        var view_bounds = new L.LatLngBounds(southWest, northEast);

        // TODO:  look at not accessing the _impl._lmap here
        this._impl._lmap.fitBounds(view_bounds);
        this._impl._lmap.setMaxBounds(view_bounds);
        this._impl._lmap.setMinZoom(
            this._impl._lmap.getBoundsZoom( view_bounds, true ) );
    };

