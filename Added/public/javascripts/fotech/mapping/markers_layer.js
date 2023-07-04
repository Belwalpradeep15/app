
/** Fotech namespace. */
var fotech = (fotech ? fotech : {});

/** Fotech map namespace. */
fotech.map = (fotech.map ? fotech.map : {});

///////////////////////////////////////////////////////////
//
//  fotech.map.MarkersLayer
//
//  - handles drawing and manipulating markers on a map
//


fotech.map.MarkersLayer = function (map) {
    fotech.map.layer.call(this, fotech.map.MarkersLayer.layer_name, map);

    this.markers = {};
    this.setBounds();
};

fotech.map.MarkersLayer.prototype = Object.create(fotech.map.layer.prototype);
fotech.map.MarkersLayer.prototype.constructor = fotech.map.MarkersLayer;

fotech.map.MarkersLayer.layer_name = "markers_layer";

fotech.map.MarkersLayer.prototype.addMarker = function (id, name, location, icon_path) {

    this.addOrUpdateMarker(id, name, location, icon_path,
        { className: 'info' },
        { // Leaflet won't display our tooltip, google displays both...
            // "tt_provider": function () {
            //     return this.getToolTipMessage(name);
            // }.bind(this)
          //  , // nothing currentl to do for clicking on Helios!
          //  "onClick": function (overlay, lat_long) {
          //      this.onClick(id, name, lat_long);
          //  }.bind(this)
        });

    this.markers[id] = {"id": id, "name" : name, "location" : location};
    this.updateBounds(location);
};

