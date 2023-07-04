/**
 * Created by arunas on 28/09/16.
 */
/** Fotech namespace. */
var fotech = (fotech ? fotech : {});

/** Fotech map namespace. */
fotech.map = (fotech.map ? fotech.map : {});

///////////////////////////////////////////////////////////
//
//  fotech.map.HeliosLayer
//
//  - handles drawing and manipulating helios units on a map
//


fotech.map.HeliosLayer = function (map) {
    fotech.map.layer.call(this, fotech.map.HeliosLayer.layer_name, map);

    this.helioses = {};
    this.setBounds();
};

fotech.map.HeliosLayer.prototype = Object.create(fotech.map.layer.prototype);
fotech.map.HeliosLayer.prototype.constructor = fotech.map.HeliosLayer;

fotech.map.HeliosLayer.layer_name = "helios_layer";
fotech.map.HeliosLayer.helios_icon = "/images/fotech/common_gui/helios_unit.png";

fotech.map.HeliosLayer.prototype.addHelios = function (id, name, location) {

    this.addOrUpdateMarker(id, name, location, fotech.map.HeliosLayer.helios_icon,
        {height: 16, width: 16},
        { // Leaflet won't display our tooltip, google displays both...
            // "tt_provider": function () {
            //     return this.getToolTipMessage(name);
            // }.bind(this)
          //  , // nothing currentl to do for clicking on Helios!
          //  "onClick": function (overlay, lat_long) {
          //      this.onClick(id, name, lat_long);
          //  }.bind(this)
        });

    this.helioses[id] = {"id": id, "name" : name, "location" : location};
    this.updateBounds(location);
};

/**
 * getToolTipMessage
 * @param fibre_route - the fibre_route to describe
 * @returns {string}
 */
fotech.map.HeliosLayer.prototype.getToolTipMessage =
    function (name) {
        return ("Helios: " + name);
    };

/**
 * react to a mouse click
 * @param fibre_route - fibre_route that's been clicked
 * @param lat_long - the click location
 */
fotech.map.HeliosLayer.prototype.onClick =
    function (id, name, lat_long) {
        // TODO:  not sure what we should do on clicking a helios unit
        alert ("You have clicked on Helios Unit: " + name);
    };

/**
 * Selects and returns all helioses within the bounds
 * @param boundsList - a list of fotech.geom.gis.Bounds....I think
 */
fotech.map.HeliosLayer.prototype.selectWithin = function(boundsList) {
    var helioses = [];

    boundsList = [boundsList].flatten();

    for (var b_idx in boundsList) {
        if (boundsList.hasOwnProperty(b_idx)) {
            var b = boundsList[b_idx];
            for (var id in this.helioses) {
                if (this.helioses.hasOwnProperty(id)) {
                    var helios = this.helioses[id];

                    if (d.contains(helios.location)) {
                        helioses[id] = helios;
                    }
                }
            }
        }
    }

    // TODO:  not really sure what do do about selecting helios units

    return helioses;
};

