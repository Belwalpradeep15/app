/*
 * FILENAME:    lat_long_track.js
 * AUTHOR:      Arunas Salkauskas
 * CREATED ON:  2016-09-07
 *
 * DESCRIPTION:  class to handle a track of lat-long positions, along with options, such as
 *               whether to include tick-marks, what colours, opacity etc.
 *               such a track can represent a fibre, a pipe-line, a rail-road route etc.
 *
 *  TODO: this has been created largely from code in the fibreRoute class, it should be
 *        a generalization of that class, so that the fibreRoute can use the functionality in here
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

/**
 * @fileoverview Items related to a lat-long track as displayed on a map.
 */

/** Fotech namespace. */
var fotech = (fotech ? fotech : {});

/** Fotech map namespace. */
fotech.map = (fotech.map ? fotech.map : {});

/**
 * TrackStyle
 * @param colour - hex code
 * @param weight - float
 * @param opacity - float between 0 - 1
 * @param ticks_on - boolean
 * @param tick_spacing - preferred spacing in m
 * @param tick_length - preferred length of ticks.
 * @constructor
 */
fotech.map.TrackStyle = function (colour, weight, opacity, ticks_on, tick_spacing, tick_length) {
    if (colour === undefined)
        colour = "#FF0000";
    if (weight === undefined)
        weight = .5;
    if (opacity === undefined)
        opacity = 1.0;
    if (ticks_on === undefined)
        ticks_on = false;
    if (tick_spacing === undefined)
        tick_spacing = 1000.0;     // metres
    if (tick_length === undefined)
        tick_length = 5.0;     // metres

    this.colour = colour;
    this.weight = weight;
    this.opacity = opacity;
    this.ticks_on = ticks_on;
    this.tick_spacing = tick_spacing;
    this.tick_length = tick_length;
};

/**
 *
 * @param id - numerical identifier of the track
 * @param name - text name for labeling
 * @param route_array - array of latlon objects, potentially extended with chainage locations down the track, chainage
 *                      is optional in which case point to point distances will be used instead - note that chainage
 *                      is not the same as fibre distance
 * @param track_style - a TrackStyle object that tells us how this track should appear
 * @param calibrations - a hash of hashes of pairs of index and fibre position, the index is into the route_array,
 *                       the base hash is by fibre segment Id:
 *                       fibre_seg_id(s) => { {idx: 1, pos: 300}, ....}
 *                       This maps a fibre position to a specific geographical location, ideally the location of the
 *                       resource being monitored, not the location of the fibre itself
 *
 * @constructor
 *
 * The reason for the slightly awkward layout of the structures is because the function will often be provided with
 * raw JSON arguments
 */
fotech.map.LatLongTrack = function (id, name, marker_name, route_array, track_style, calibrations) {
    this.id = id;
    this.name = name;
    this.marker_name = marker_name;

    if (track_style === undefined)
        track_style = new fotech.map.TrackStyle();
    this.track_style = track_style;

    this.pline = [];
    this.chainage = [];
    this.bounds = {};
    // TODO:  this is awkward, because if this is null, then there's not much we can do with the object!
    if (route_array instanceof Array && route_array.length ) {
        var latlngs = route_array.collect(function (a) {
            return new LatLon(a.lat(), a.lon());
        });
        this.pline = new fotech.geom.gis.Route(latlngs);
        this.pline.route = this;    // Needed for accessing in callbacks. // TODO:  this was copied and pasted - not sure it's needed.
        this.chainage = route_array.collect(function (a) {
            return a.chainage;
        });

        this.bounds = this.pline.getBounds();
    }

    this.delta_chainages = [];       // the chainage between each sequential pair of vertices
    this.delta_distances = [];       // the distance (~straight line) between each sequential pair of vertices
    this.point_distances = [0.0];    // the distance along the map from the point to the start

    if (calibrations) {
        this._setCalibrations(calibrations);
    }

    this._preCalculateRouteInformation();
};

/**
 * Obtain the bounds of the route.
 * @return A fotech.geom.gis.Bounds object describing the bounds of the route.
 */
fotech.map.LatLongTrack.prototype =
{
    getBounds: function () {
        return this.bounds;
    },

    // // TODO:  finish or delete these methods
    // getFibrePositionAlongTrack: function (latlng) {
    //     var closestLatLng = this.pline.getClosestLatLng(latlng);
    //
    //     return this.toFibrePosition(this.pline.getDistanceAlongRoute(latlng));
    // },
    //
    // toFibreWithPosition: function (trackDistance) {
    //
    //     for (var fibre_seg_id in this.calibrations) {
    //         // TODO: locate which fibre contains calibration information for this distance down the track
    //
    //         var lastCalibration = this.calibrations[fibre_seg_id][0];
    //         var lastCalibrationIndex = 0;
    //         var calibratedDistance = null;
    //
    //         for (var i = 1; i < this.calibrations.length; i++) {
    //             var calibration = this.calibrations[i];
    //             if (calibration) {
    //                 var pointDistance = this.point_distances[i];
    //                 var lastPointDistance = this.point_distances[lastCalibrationIndex];
    //
    //                 if (trackDistance <= pointDistance) {
    //                     var lineSegmentDistance = calibration - lastCalibration;
    //                     var trackSegmentDistance = pointDistance - lastPointDistance;
    //                     var deltaTrackDistance = trackDistance - lastPointDistance;
    //
    //                     calibratedDistance = (deltaTrackDistance * lineSegmentDistance / trackSegmentDistance) + lastCalibration;
    //                     break;
    //                 } else {
    //                     lastCalibration = calibration;
    //                     lastCalibrationIndex = i;
    //                 }
    //             }
    //         }
    //     }
    //     return calibratedDistance;
    // },



    /**
     * uses a bisection search to locate the track segment (pair of indices in calibrations) that corresponds to
     * the fibre location specified.
     * note that there is no guarantee that the pair of indices are sequential - the segment may involve
     * multiple lat-long pairs.
     * @param fibre_seg_id
     * @param fibre_position  in metres
     * @returns {null}
     * @private
     */
    _getTrackSegment: function (fibre_seg_id, fibre_position) {
        var calibrations = this.calibrations[fibre_seg_id];
        if (fibre_position < calibrations[0].pos || fibre_position > calibrations[calibrations.length - 1].pos)
            return null; // input distance is out of range

        // worst case anticipated is 2 elements.  right = 2/2 == 1, left = 1-1 == 0
        var start = 0;
        var end = calibrations.length;
        while (true) {
            var right_idx = Math.floor((start + end) / 2);
            var left_idx = right_idx - 1;
            var left_calibration = calibrations[left_idx].pos;
            var right_calibration = calibrations[right_idx].pos;

            if (fibre_position < left_calibration) {
                end = right_idx + 1;
            }
            else if (fibre_position > right_calibration) {
                start = right_idx;
            }
            else {
                // now between left_idx and right_idx
                return {
                    left_idx: calibrations[left_idx].idx,
                    left_pos: left_calibration,
                    right_idx: calibrations[right_idx].idx,
                    right_pos: right_calibration
                }
            }
        }
    },
    /**
     * interpolates on a great circle segment between the two lat-long positions deemed to be on either side
     * of the indicated fibre_position.
     * Since the position is on a straight(ish)-line segment, the interpolation uses the point to point distance between
     * vertices of the polyline, not the chainage.
     *
     *
     * @param fibre_seg_id
     * @param fibre_position - position down the fibre in m
     * @returns {*}
     * @private
     */
    _latLngFromFibrePosition: function (fibre_seg_id, fibre_position) {
        var i;
        var track_segment = this._getTrackSegment(fibre_seg_id, fibre_position);

        if (track_segment == null)
            return null;

        var fraction_of_fibre_pos = (fibre_position - track_segment.left_pos) / (track_segment.right_pos - track_segment.left_pos);
        var total_segment_length = 0.0;
        for (i = track_segment.left_idx; i < track_segment.right_idx; i++) {
            total_segment_length += this.delta_distances[i];
        }
        var fractional_segment_length = total_segment_length * fraction_of_fibre_pos;
        for (i = track_segment.left_idx; i < track_segment.right_idx; i++) {
            if (fractional_segment_length < this.delta_distances[i]) {
                var frac = fractional_segment_length / this.delta_distances[i];
                var pointA = this.pline.getVertex(i);
                var pointB = this.pline.getVertex(i + 1);
                return pointA.intermediatePointTo(pointB, frac);
            }

            fractional_segment_length -= this.delta_distances[i];

        }
        return null;
    },

    latLngFromChainage: function (chainage) {
        var chainages = this.chainage;
        if (chainage < chainages[0] || chainage > chainages[chainages.length - 1])
            return null;
        // bisection search for segment containing that chainage
        var start = 0;
        var end = chainages.length;

        while (true) {
            var right_idx = Math.floor((start + end) / 2);
            var left_idx = right_idx - 1;

            var left_chg = chainages[left_idx];
            var right_chg = chainages[right_idx];

            if (chainage < left_chg) {
                end = right_idx + 1;
            }
            else if (chainage > right_chg) {
                start = right_idx;
            }
            else {
                var frac = (chainage - left_chg) / (right_chg - left_chg);
                var pointA = this.pline.getVertex(left_idx);
                var pointB = this.pline.getVertex(right_idx);

                return pointA.intermediatePointTo(pointB, frac);
            }
        }
    },

    chainageFromLatLng: function (latlng) {
        var closest_pair = this.pline.getClosestSegment(latlng);
        var partial_dis = latlng.distanceAlongLine(closest_pair.first, closest_pair.second);

        // At first glance you may think that we want to return the value
        //
        //    this.chainage[closest_pair.first_idx] + partial_dis
        //
        // That is almost correct, however since the this.chainage array is our array
        // of calibrated values, we want to ensure that the "+ partial_dis" does not
        // take things into our next segment or leave us short in the current one. So
        // we use a linear interpolation to "stretch/squeeze" the partial_dis into
        // the two calibrated points.
        var seg_dis = closest_pair.first.distanceTo(closest_pair.second);
        return this.chainage[closest_pair.first_idx]
            + (partial_dis / seg_dis) * (this.chainage[closest_pair.second_idx] - this.chainage[closest_pair.first_idx])
    },

    /**
     * calibrations is a hash of hashes: fibre_seg_id(s) => { {idx: 1, pos: 300}, ....}
     * idx is an index into the vertex array, pos is the position down the particular fibre,
     * of which the fibre_seg is a portion.
     *
     * this currently just copies the incoming calibrations...
     * @param calibrations
     * @private
     */
    _setCalibrations: function (calibrations) {
        this.calibrations = {};
        for (var fibre_seg_id in calibrations) {
            if (calibrations.hasOwnProperty(fibre_seg_id)) {
                this.calibrations[fibre_seg_id] = [];
                var calibs = this.calibrations[fibre_seg_id];
                var fibre_calibrations = calibrations[fibre_seg_id];
                for (var i = 0; i < fibre_calibrations.length; i++) {
                    var calibration = fibre_calibrations[i];
                    calibs[calibs.length] = {idx: calibration.idx, pos: fibre_calibrations.pos};
                }
            }
        }
    },

    /**
     * calculates, if needed, the distances along the track described by the
     * lat-long vertices.  Wherever chainage was provided in the definition then that is used instead.
     * @private
     */
    _preCalculateRouteInformation: function () {
        var vertexCount = this.pline.getVertexCount();
        if (vertexCount) {
            var lastVertex = this.pline.getVertex(0);
            if (this.chainage[0] == null || this.chainage[0] == undefined) {
                this.chainage[0] = starting_chainage;
            }
            for (var i = 1; i < vertexCount; i++) {
                var vertex = this.pline.getVertex(i);
                var delta_distance = lastVertex.distanceTo(vertex);
                if (this.chainage[i] == null || this.chainage[i] == undefined) {
                    // TODO:  this could be approximated better when chainage values
                    //        are sparse, for example looking at all the vertices between
                    //        points with measured chainage and distributing the chainage between them
                    //        right now, this is roughly assuming that chainage simply wasn't provided at all.
                    this.chainage[i] = this.chainage[i - 1] + delta_distance;
                }
                this.delta_chainages[i - 1] = this.chainage[i] - this.chainage[i - 1];
                this.delta_distances[i - 1] = delta_distance;
                this.point_distances[i] = this.point_distances[i - 1] + delta_distance;
                lastVertex = vertex;
            }
            this.track_length = this.chainage[this.chainage.length - 1];
        }
    },

    getTicks: function () {
        var point_pairs = [];
        var first_tick = Math.ceil(this.chainage[0] / this.track_style.tick_spacing) * this.track_style.tick_spacing;
        var half_tick_length =  this.track_style.tick_length / 2;
        for (var chainage = first_tick ; chainage < this.track_length ; chainage += this.track_style.tick_spacing) {
            var edge_case = 0;
            if (chainage - half_tick_length < first_tick){
                edge_case += 1;
            }
            if (chainage + half_tick_length > this.track_length) {
                edge_case += 2;
            }
            var loc1 = this.latLngFromChainage(chainage);
            var loc2;
            switch(edge_case) {
                default:
                case 0: // normal, middle of the track
                    loc2 = this.latLngFromChainage(chainage + half_tick_length);
                    break;
                case 1: //at the left end
                    loc2 = this.latLngFromChainage(chainage + half_tick_length);
                    break;
                case 2: //at the right end
                    loc2 = this.latLngFromChainage(chainage - half_tick_length);
                    break;
                case 3: // at both ends.  That's pretty strange.
                    loc2 = this.latLngFromChainage(this.track_length);
                    break;
            }

            var perp_bearing = loc1.bearingTo(loc2) + 90 ;

            var p1 = loc1.destinationPoint(perp_bearing, - half_tick_length);
            var p2 = loc1.destinationPoint(perp_bearing, + half_tick_length);

            if (p1.isValid() && p2.isValid()) {
                var tick = [p1, p2];
                point_pairs.push(tick);
            }
            else {
                console.log("WARNING: invalid lat/long for tick " + chainage + " on " + this.name);
            }
        }
        return point_pairs;
    },

    // // TODO:  these methods would technically need to either know which fibre segment to look at,
    // //        or precalculate the max and min distances for all fibres during setCalibrations
    // getMinimumDistance: function () {
    //     return this.calibrations[0];
    // },
    //
    // getMaximumDistance: function () {
    //     return this.calibrations[this.calibrations.length - 1];
    // },

    // TODO:  I'm really not sure what this is good for
    inspect: function () {
        return this.delta_chainages + " :: " + this.point_distances + " :: " + this.calibrations;
    }

// // Compute the points that need to be drawn on the overlay.
//     // TODO:  finish or delete this method
//     getLatLngsForSubsection: function (startingPosition, endingPosition) {
//         var pointsToDraw = [];
//         var dist;
//         var pnt = this._toLatLng(startingPosition);
//         if (pnt)
//             pointsToDraw[pointsToDraw.length] = pnt;
//         for (var i = 0; i < this.trackPoints.length; ++i) {
//             dist = this.toFibreDistance(this.point_distances[i]);
//             if (dist > startingPosition && dist < endingPosition) {
//                 pnt = this._toLatLng(dist);
//                 if (pnt)
//                     pointsToDraw[pointsToDraw.length] = pnt;
//             }
//         }
//         pnt = this._toLatLng(endingPosition);
//         if (pnt)
//             pointsToDraw[pointsToDraw.length] = pnt;
//
//         return pointsToDraw;
//
//     }
};

