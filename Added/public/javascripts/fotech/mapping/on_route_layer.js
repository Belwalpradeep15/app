/*
 * FILENAME:    on_route_paths.js
 * AUTHOR:      Arunas Salkauskas
 * CREATED ON:  2016-09-16
 *
 * DESCRIPTION:  functions to handle adding on_route path display
 *
 *
 * LAST CHANGE:
 * $Author$
 *   $Date$
 *    $Rev$
 *    $URL$
 *
 * COPYRIGHT:
 * This file is Copyright (c) 2016 Fotech Solutions Ltd. All rights reserved.
 */

/** Fotech namespace. */
var fotech = (fotech ? fotech : {});

/** Fotech map namespace. */
fotech.map = (fotech.map ? fotech.map : {});

fotech.map.OnRouteLayer = function (map) {
    fotech.map.layer.call(this, fotech.map.OnRouteLayer.layer_name, map);

    this.setBounds();
};

fotech.map.OnRouteLayer.prototype = Object.create(fotech.map.layer.prototype);
fotech.map.OnRouteLayer.prototype.constructor = fotech.map.OnRouteLayer;

fotech.map.OnRouteLayer.layer_name = "on_route_layer";

fotech.map.OnRouteLayer.prototype.add_on_route_path = function (path, path_segments, fibreRoutes) {
    var lat_lngs = [];
    var starting_chainage;

    for (var i = 0; i < path_segments.length; i++) {
        var path_seg = path_segments[i];
        //if (path_segments.hasOwnProperty(seg_id)) {
            starting_chainage = path_seg.distance_from_marker;

            var start = path_seg.start_distance;
            var end = path_seg.end_distance;
            //TODO: #23106. The 'normalizer' field in the path_segments table can be deprecated.
            //This is the only place it gets used and is mostly 1 (sometimes -1 for a reverse path_segment/chainage).
            if (path_seg.normalizer < 0) {
                var c = start;
                start = end;
                end = c;
            }
            if (fibreRoutes.hasOwnProperty(path_seg.fibre_line_id)) {
                var sub_lats = fibreRoutes[path_seg.fibre_line_id].getLatLngsForSubsection(start, end);
                if (path_seg.normalizer < 0)
                    sub_lats.reverse();
                if (sub_lats.length) {
                    sub_lats[0].chainage = starting_chainage;
                    // #23062 - commented this out, as we don't want to use starting_chainage
                    // to influence the previous segment. They are completely independent.
                    // if (lat_lngs.length > 0) {
                    //     lat_lngs[lat_lngs.length-1].chainage = starting_chainage;
                    // }
                }
                lat_lngs = lat_lngs.concat(sub_lats);
            }
        //}
    }

    if (lat_lngs.length) {
        var ll_track = new fotech.map.LatLongTrack(path.id, path.name, path.marker_name, lat_lngs, this.track_style);
        this.addLatLongTrack(ll_track);

        this.updateBounds(ll_track.getBounds().getSWNE());
    }
};

/**
 * getToolTipMessage
 * @param point - the location to describe
 * @lat_long_track - the track to look at
 * @param unit_convertor - a function for converting units
 * @param dest_unit - the display unit to convert to.
 * @returns {string}
 */
fotech.map.OnRouteLayer.prototype.getToolTipMessage = function (point, lat_long_track, unit_convertor, dest_unit) {
    var chainage = fotech.util.round10(lat_long_track.chainageFromLatLng(point), 0);
    if (unit_convertor != undefined)
        chainage = unit_convertor(chainage, "m", dest_unit);
    else
        dest_unit = "m";

    return  I18n.t("prefs.section.routes.Route") + ": " + lat_long_track.name + "<br>" +
            I18n.t("admin.marker.title") + ": " + lat_long_track.marker_name + "<br>" +
            I18n.t("prefs.section.routes.Chainage") + ": " + fotech.util.round10(chainage, -2) +
            I18n.t("prefs.section.units.units-short." + dest_unit);
};
fotech.map.OnRouteLayer.prototype.addLatLongTrack = function (lat_long_track) {
    var lineID = this.addPolyLine(lat_long_track.pline.route.pline.vertices, lat_long_track.track_style,
        {
            "tt_provider": function (overlay, lat_long) {
                return this.getToolTipMessage(lat_long, lat_long_track, fotech.util.convert, this.map.distanceUnits);
            }.bind(this),
            "onClick": function (overlay, lat_long) {
                this.onClick(lat_long_track, lat_long);
            }.bind(this)
        });
    this.addTickMarks(lat_long_track);
};
fotech.map.OnRouteLayer.prototype.addTickMarks = function (lat_long_track) {
    if (lat_long_track.track_style.ticks_on) {
        var ticks = lat_long_track.getTicks();
        for (var i = 0; i < ticks.length; i++) {
            this.addPolyLine(ticks[i], lat_long_track.track_style,
                {
                    "tt_provider": function (overlay, lat_long) {
                        return this.getToolTipMessage(lat_long, lat_long_track, fotech.util.convert, this.map.distanceUnits);
                    }.bind(this),
                    "onClick": function (overlay, lat_long) {
                        this.onClick(lat_long_track, lat_long);
                    }.bind(this)
                });
        }
    }
};

/**
 * react to a mouse click
 * @param fibre_route - fibre_route that's been clicked
 * @param lat_long - the click location
 */
fotech.map.OnRouteLayer.prototype.onClick =
    function (route, lat_long) {
        this.map.zoomToBounds(route.getBounds());
    };


