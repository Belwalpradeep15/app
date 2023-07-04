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

fotech.map.RefPointLayer = function (map) {
    fotech.map.layer.call(this, fotech.map.RefPointLayer.layer_name, map);

    this.ref_points = {};
    this.setBounds();
};

fotech.map.RefPointLayer.prototype = Object.create(fotech.map.layer.prototype);
fotech.map.RefPointLayer.prototype.constructor = fotech.map.RefPointLayer;

fotech.map.RefPointLayer.layer_name = "ref_point_layer";
fotech.map.RefPointLayer.ref_point_icon = "/images/fotech/common_gui/reference_point-16x16.png";

fotech.map.RefPointLayer.prototype.addReferencePoint = function (id, name, location) {

    this.addOrUpdateMarker(id, name, location, fotech.map.RefPointLayer.ref_point_icon,{},
        {
    //         "tt_provider": function () {
    //             return this.getToolTipMessage(name, location);
    //         }.bind(this)
    //     //     , // nothing to do on a click for now.
    //     //     "onClick": function (overlay, lat_long) {
    //     //     this.onClick(id, name, lat_long);
    //     // }.bind(this)
     }
    );

    this.updateBounds(location);
    this.ref_points[id] = {"id": id, "name" : name, "location" : location};
};

/**
 * getToolTipMessage
 * @param fibre_route - the fibre_route to describe
 * @returns {string}
 */
fotech.map.RefPointLayer.prototype.getToolTipMessage =
    function (name, location) {
        return (name + "<br>(" + location.toString("dms", 8) +")");
    };

/**
 * react to a mouse click
 * @param fibre_route - fibre_route that's been clicked
 * @param lat_long - the click location
 */
fotech.map.RefPointLayer.prototype.onClick =
    function (id, name, lat_long) {
        // TODO:  not sure what we should do on clicking a reference point unit
        alert ("You have clicked on Reference point: " + name);
    };

/**
 * Selects and returns all helioses within the bounds
 * @param boundsList - a list of fotech.geom.gis.Bounds....I think
 *
 * TODO:  This looks like it's almost identical across all the 'marker' type layers...
 */
fotech.map.RefPointLayer.prototype.selectWithin = function(boundsList) {
    var ref_points = [];

    boundsList = [boundsList].flatten();

    for (var b_idx in boundsList) {
        if (boundsList.hasOwnProperty(b_idx)) {
            var b = boundsList[b_idx];
            for (var id in this.helioses) {
                if (this.ref_points.hasOwnProperty(id)) {
                    var ref_point = this.ref_points[id];

                    if (d.contains(ref_point.location)) {
                        ref_points[id] = ref_point;
                    }
                }
            }
        }
    }

    // TODO:  not really sure what do do about selecting reference points units

    return ref_points;
};

