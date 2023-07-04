/*
 * FILENAME:    fibre.js
 * AUTHOR:      Steven Klassen
 * CREATED ON:  2008-10-02
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
 * @fileoverview Items related to a fibre as displayed on a map.
 */

/** Fotech namespace. */
var fotech = (fotech ? fotech : {});

/** Fotech map namespace. */
fotech.map = (fotech.map ? fotech.map : {});


/**
 * Construct a fibre route.
 * @param id - The id of the fibre route.
 * @param name - The name of the fibre route.
 * @param route_array - the array of points
 * @param calibrations - an array of calibrations,
 * @constructor
 * @class
 * The FibreRoute class implements a map overlay representing the route that an individual
 * fibre follows.
 */
fotech.map.FibreRoute = function (id, name, route_array, calibrations, heliosUnit) {
    this.id = id;
    this.name = name;
    if (heliosUnit) {
        this.host_name = heliosUnit.host_name;
        this.helios_channel_id = heliosUnit.channel_id;
    }

    if (route_array != null) {
        var latlngs = route_array.collect(function (a) {
            return new LatLon(a.lat, a.long);
        });
        this.pline = new fotech.geom.gis.Route(latlngs);
        this.pline.route = this;    // Needed for accessing in callbacks.  TODO:  was...still?
    }

    this.trackLength = 0.0;         // actual total distance on land
    this.deltaDistances = [];       // the distances between each vertex
    this.trackPoints = [];          // the vertex points
    this.pointDistances = [0.0];    // the distance along the map from the point to the start

    if (calibrations) {
        this._setCalibrations(calibrations);
    }
    this._calculateRouteInformation();
    this._bounds = this.pline.getBounds();
};

/**
 * creates a fibre route, but given the slightly different format of data that
 * we currently get from the 'section' calibrations.  That is, calibration points as
 * calibrated to an image, or 'document', also known as an engineering diagram or 'section'
 *
 * TODO:  I'd rather refactor the ruby that provides this information so that we can unify
 *        things and use the above constructor directly.
 * @param id
 * @param name
 * @param mixed - object of 3 arrays { fibre_distances: [...], x_offsets: [...], y_offsets: [...]
 * @constructor
 */
fotech.map.FibreRoute.FromDiagramCalibrations = function (id, name, mixed, helios_unit) {
    var transformed =  fotech.map.FibreRoute.DiagramDataToMapData(mixed);

    return new fotech.map.FibreRoute(id, name, transformed.route_array, transformed.calibrations, helios_unit);
};
/**
 * looks after the unfortunate difference in data format, put here so that it can be used for calibrating
 * to a diagram
 */
fotech.map.FibreRoute.DiagramDataToMapData = function(mixed) {
    var route_array = [];
    var x_offsets = mixed.x_offsets;
    var y_offsets = mixed.y_offsets;
    var distances = mixed.fibre_distances;
    for(var i = 0; i < mixed.fibre_distances.length ; i ++) {
        route_array.push({lat: y_offsets[i], long: x_offsets[i]});
    }
    return {route_array: route_array, calibrations: mixed.fibre_distances};
};

fotech.map.FibreRoute.prototype = {
    getName: function() { return this.name; },
    /**
     * Obtain the bounds of the route.
     * @return A fotech.geom.gis.Bounds object describing the bounds of the route.
     */
    getBounds: function () {
        return this._bounds;
    },

    _calculateRouteInformation: function () {
        var vertexCount = this.pline.getVertexCount();
        for (var i = 0; i < vertexCount; i++) {
            var vertex = this.pline.getVertex(i);
            var distance = this._calculateDistance(vertex);

            this.trackLength += distance;
            this.deltaDistances[this.deltaDistances.length] = distance;
            if (i != 0) {
                this.pointDistances[i] = this.pointDistances[i - 1] + distance;
            }
            this.trackPoints[this.trackPoints.length] = vertex;
        }
    },

    _calculateDistance: function (latlng) {
        if (this.trackPoints.length == 0) {
            return 0.0;
        }
        else {
            return this.trackPoints[this.trackPoints.length - 1].distanceTo(latlng);
        }
    },

    getFibreDistanceAlongRoute: function (latlng) {
        window.console.log("original latlng: " + latlng.lat() + " " + latlng.lon());
        var closestLatLng = this.pline.getClosestLatLng(latlng);
        window.console.log("closest latlng:  " + closestLatLng.lat() + " " + closestLatLng.lon());
        window.console.log("distance along route:" + this.pline.getDistanceAlongRoute(latlng));
        return this.toFibreDistance(this.pline.getDistanceAlongRoute(latlng));
    },

    toFibreDistance: function (trackDistance) {
        var lastCalibration = this.calibrations[0];
        var lastCalibrationIndex = 0;
        var calibratedDistance = null;

        for (var i = 1; i < this.calibrations.length; i++) {
            var calibration = this.calibrations[i];
            if (calibration) {
                var pointDistance = this.pointDistances[i];
                var lastPointDistance = this.pointDistances[lastCalibrationIndex];

                if (trackDistance <= pointDistance) {
                    var lineSegmentDistance = calibration - lastCalibration;
                    var trackSegmentDistance = pointDistance - lastPointDistance;
                    var deltaTrackDistance = trackDistance - lastPointDistance;

                    calibratedDistance = (deltaTrackDistance * lineSegmentDistance / trackSegmentDistance) + lastCalibration;
                    break;
                } else {
                    lastCalibration = calibration;
                    lastCalibrationIndex = i;
                }
            }
        }
        return calibratedDistance;
    },

    toTrackDistance: function (fibreDistance) {
        if (fibreDistance < this.getMinimumDistance() || fibreDistance > this.getMaximumDistance()) {
            return null;
        }
        var lastCalibration = this.calibrations[0];
        var lastCalibrationIndex = 0;
        var calibratedDistance = null;

        for (var i = 1; i < this.calibrations.length; i++) {
            var calibration = this.calibrations[i];
            if (calibration != null) {
                if (fibreDistance <= calibration) {
                    var lineSegmentDistance = calibration - lastCalibration;
                    var trackSegmentDistance = this.pointDistances[i] - this.pointDistances[lastCalibrationIndex];
                    var deltaLineDistance = fibreDistance - lastCalibration;

                    calibratedDistance = (deltaLineDistance * trackSegmentDistance / lineSegmentDistance) + this.pointDistances[lastCalibrationIndex];
                    break;
                } else {
                    lastCalibration = calibration;
                    lastCalibrationIndex = i;
                }
            }
        }
        return calibratedDistance;
    },


// TODO: this is ridiculously inefficient because in order to get the trackDistance,
//       we specifically find two points that we're between, and then we do it all again
//       here.  And even then it just looks strange
    latLngFromFibrePosition: function (inputMeters) {

        var distance = this.toTrackDistance(inputMeters);

        if (distance == null)
            return null;

        var epsilon = 1e-10;
        for (var i = 0; i < this.deltaDistances.length; i++) {
            if (distance == this.deltaDistances[i]) {
                return this.pline.getVertex(i);
            }
            else if (distance < this.deltaDistances[i]) {
                var pointA = this.pline.getVertex(i - 1);
                var pointB = this.pline.getVertex(i);
                var fraction = distance / this.deltaDistances[i];

                var lngDist = (pointB.lon() - pointA.lon());
                var latDist = (pointB.lat() - pointA.lat());

                var newLng = pointA.lon() + (lngDist * fraction);
                var newLat = pointA.lat() + (latDist * fraction);

                return new LatLon(newLat, newLng);
            }
            else {
                distance -= this.deltaDistances[i];
            }

            if (distance < epsilon)  // to account for if the point is very very near, but longer than the end point
                return this.pline.getVertex(i);
        }
        return null;
    },

    _setCalibrations: function (calibrations) {
        this.calibrations = [];
        for (var i = 0; i < calibrations.length; i++) {
            this.calibrations[i] = calibrations[i];
        }
    },

    lastFibreVertex: function() {
        return this.pline.getVertex(this.pline.getVertexCount() - 1);
    },

    getMinimumDistance: function () {
        for (var i = 0; i < this.calibrations.length; i++) {
            if (this.calibrations[i] != null)
                return this.calibrations[i];
        }
        return null;
    },

    getMaximumDistance: function () {
        for (var i = this.calibrations.length - 1; i >= 0; i--) {
            if (this.calibrations[i] != null)
                return this.calibrations[i];
        }
        return null;
    },

    inspect: function () {
        return this.deltaDistances + " :: " + this.pointDistances + " :: " + this.calibrations + " :: " + this.trackPoints;
    },

    /**
     * get a collection of latlons that starts and ends at the indicated distances
     * @param startingPosition - metre position of start of subsection
     * @param endingPosition - metre position of end of subsection - defaults to end of fibre if ommitted
     * @returns {Array} of latlon
     */
    getLatLngsForSubsection: function (startingPosition, endingPosition) {
        var pointsToDraw = [];
        var dist;
        var pnt = this.latLngFromFibrePosition(startingPosition);
        if (pnt)
            pointsToDraw[pointsToDraw.length] = pnt;
        if (typeof endingPosition == "undefined")
            endingPosition = this.getMaximumDistance();
        for (var i = 0; i < this.trackPoints.length; ++i) {
            dist = this.toFibreDistance(this.pointDistances[i]);
            if (dist > startingPosition && dist < endingPosition) {
                pnt = this.latLngFromFibrePosition(dist);
                if (pnt)
                    pointsToDraw[pointsToDraw.length] = pnt;
            }
        }
        try {
            pnt = this.latLngFromFibrePosition(endingPosition).clone();
            if (pnt)
                pointsToDraw[pointsToDraw.length] = pnt;
        } catch ( e ){
            console.log( "Unable to derive lat/lng for subsection", endingPosition, e );
        }

        return pointsToDraw;
    }
};


