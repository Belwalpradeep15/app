/*
 #  gis.js
 #  panoptes
 #
 #  Created by Steven W. Klassen on 2013-02-24.
 #  Copyright (c) 2013 Fotech Solutions (Canada) Ltd. All rights reserved.

 GIS based geometry extensions .
 requires latlon.js and geo.js from http://www.movable-type.co.uk/scripts/latlong.html

 */
/**
 * vendor/latlon.js is required, we tweak it with this function
 */
LatLon.prototype.clone = function () {
    return new LatLon(this._lat, this._lon);
};

// Setup the namespaces.
var fotech = (fotech ? fotech : {});
fotech.geom = (fotech.geom ? fotech.geom : {});
fotech.geom.gis = (fotech.geom.gis ? fotech.geom.gis : {});

// some internal utilities.
fotech.geom.gis._min = function (v1, v2) {
    if (v1 <= v2)
        return v1;
    else
        return v2;
};
fotech.geom.gis._max = function (v1, v2) {
    if (v1 >= v2)
        return v1;
    else
        return v2;
};
fotech.geom.gis._inrange = function (v, minV, maxV) {
    return ((minV <= v) && (v <= maxV));
};


/**
 * An implementation of a route. This is essentially an ordered array of lat/long pairs.
 */
fotech.geom.gis.Route = function (parray) {
    this.vertices = parray;
    this.lengths = [];    //array to hold the length between each vertex and the one before it
    this.distances = [];  //array to hold distance from point to first point
    this.calculateDistances();
};

fotech.geom.gis.Route.prototype.calculateDistances = function () {
    this.lengths = [0];
    this.distances = [0];
    for (var i = 0, len = this.vertices.length - 1; i < len; i++) {
        var v1 = this.vertices[i], v2 = this.vertices[i + 1];
        var length = v1.distanceTo(v2);
        this.lengths.push(length);
        this.distances.push(this.distances.last() + length);
    }
};

// Return the bounds of the route.
fotech.geom.gis.Route.prototype.getBounds = function () {
    return new fotech.geom.gis.Bounds(this.vertices);
};

// Return the number of vertexes in the route.
fotech.geom.gis.Route.prototype.getVertexCount = function () {
    return this.vertices.length;
};

// Return the ith vertex in the route.
fotech.geom.gis.Route.prototype.getVertex = function (i) {
    return this.vertices[i];
};

fotech.geom.gis.Route.prototype.getClosestSegment = function (latlng) {
    var closestLengthIndex = 0;
    var closestDistance = Number.POSITIVE_INFINITY;
    for (var i = 0, len = this.vertices.length - 1; i < len; i++) {
        var closest = latlng.closestPointOnSegment(this.vertices[i], this.vertices[i + 1]);
        var d = latlng.distanceTo(closest);
        if (d <= closestDistance) {
            closestDistance = d;
            closestLengthIndex = i;
        }
    }
    return {
        first: this.vertices[closestLengthIndex],
        second: this.vertices[closestLengthIndex + 1],
        first_idx: closestLengthIndex,
        second_idx: closestLengthIndex + 1
    };
};
// Returns the point on the route that is closest to the given point.
fotech.geom.gis.Route.prototype.getClosestLatLng = function (latlng) {
    var seg = this.getClosestSegment(latlng);
    return latlng.closestPointOnSegment(seg.first, seg.second);
};

// Returns the distance along the route that is closest to the given point.
fotech.geom.gis.Route.prototype.getDistanceAlongRoute = function (latlng) {
    var seg = this.getClosestSegment(latlng);
    return this.distances[seg.first_idx] + latlng.distanceAlongLine(seg.first, seg.second);
};


/**
 * Lat/long based bounds. This creates a bounds that contains all the given
 * points. The points must all be LatLon objects.
 */
fotech.geom.gis.Bounds = function (parray) {
    var len = parray.length;
    if (len <= 0)
        throw "Error: Cannot create bounds from an empty array.";
    this.southwest = parray[0].clone();
    this.northeast = parray[0].clone();
    for (var i = 1; i < len; ++i)
        this.extend(parray[i]);
};

fotech.geom.gis.Bounds.prototype = {
    getSouthWest: function () {
        return this.southwest;
    },
    getNorthEast: function () {
        return this.northeast;
    },
    getSouthWestPoint: function () {
        return this.southwest.toPoint();
    },
    getNorthEastPoint: function () {
        return this.northeast.toPoint();
    },
    getSWNE: function() {
        return [this.southwest, this.northeast];
    },
    getSWNEPoints: function() {
        return [this.southwest.toPoint(), this.northeast.toPoint()];
    },

    /**
     * Extend the bounds to include a new point (a LatLong), points, or bounds
     * @param p - LatLon, [] of LatLon, or fotech.geom.gis.Bounds
     */
    extend: function (p) {
        if (typeof p.lat == "function") {
            this.southwest._lat = Math.min(this.southwest.lat(), p.lat());
            this.southwest._lon = Math.min(this.southwest.lon(), p.lon());
            this.northeast._lat = Math.max(this.northeast.lat(), p.lat());
            this.northeast._lon = Math.max(this.northeast.lon(), p.lon());
        }
        else if (typeof p.length == "number") {
            this.extend(new fotech.geom.gis.Bounds(p));
        }
        else if (p instanceof fotech.geom.gis.Bounds){
            this.southwest._lat = Math.min(this.southwest.lat(), p.southwest.lat());
            this.southwest._lon = Math.min(this.southwest.lon(), p.southwest.lon());
            this.northeast._lat = Math.max(this.northeast.lat(), p.northeast.lat());
            this.northeast._lon = Math.max(this.northeast.lon(), p.northeast.lon());
        }
    },

// Returns true if the bounds contain all the points in the given array. We
// assume that all bounds contain the empty array.
    contains: function (parray) {
        var len = parray.length;
        for (var i = 0; i < len; ++i) {
            if (!fotech.geom.gis._inrange(parray[i].lat(), this.southwest.lat(), this.northeast.lat())
                || !fotech.geom.gis._inrange(parray[i].lon(), this.southwest.lon(), this.northeast.lon()))
                return false;
        }
        return true;
    },

// Returns true if the bounds contains any portion of the bounds defined by the
// given array of LatLong points.
// TODO:  I'm not sure that this actually works in all cases - Arunas
//        actually, I don't think it works at all!
    intersects: function (parray) {
        if (parray.southwest) {
            parray = [parray.getSouthWest(), parray.getNorthEast()];
        }
        // If any of the points are within our bounds, then we return true.
        var len = parray.length;
        for (var i = 0; i < len; ++i) {
            if (fotech.geom.gis._inrange(parray[i].lat(), this.southwest.lat(), this.northeast.lat())
                && fotech.geom.gis._inrange(parray[i].lon(), this.southwest.lon(), this.northeast.lon()))
                return true;
        }

        // If we make it this far it is still possible that we have an intersection, but
        // only if the bounds of parray contains one of our endpoints.
        var pBounds = new fotech.geom.gis.Bounds(parray);
        return (pBounds.contains([this.southwest]) || pBounds.contains([this.northeast]));
    },

    /**
     * Computes the set of poly lines that intersect this bounding rectangle
     * @param ll_array -  an array of LatLon objects
     * @returns {Array} of arrays of LatLon objects.  May be empty.
     */
    intersection: function (ll_array) {
        var ll_arrays = [];
        if (this.contains(ll_array)) {
            ll_arrays.push(ll_array);
        }
        else {
            var len = ll_array.length;
            var bRect = new fotech.geom.Rectangle(this.getSouthWestPoint(), this.getNorthEastPoint());
            var newPoly = [];
            if (len > 1) {
                for (var i = 1; i < len; ++i) {
                    var start = ll_array[i - 1].toPoint();
                    var end = ll_array[i].toPoint();
                    var seg = bRect.intersection(new fotech.geom.Segment(start, end));
                    if (seg) {
                        if (newPoly.length) {
                            if (seg.p1.almostEqual(start)) {
                                newPoly.push(seg.p2.toLatLon());
                                if (! seg.p2.almostEqual(end)) {
                                    ll_arrays.push(newPoly);
                                    newPoly = [];
                                }
                            }
                            else if (seg.p2.almostEqual(start)) {
                                newPoly.push(seg.p1.toLatLon());
                                if (! seg.p1.almostEqual(end)) {
                                    ll_arrays.push(newPoly);
                                    newPoly = [];
                                }
                            }
                        }
                        else {

                            if (seg.p1.almostEqual(start)) {
                                newPoly.push(seg.p1.toLatLon());
                                newPoly.push(seg.p2.toLatLon());
                            }
                            else if (seg.p2.almostEqual(start)) {
                                newPoly.push(seg.p2.toLatLon());
                                newPoly.push(seg.p1.toLatLon());
                            }
                            else if (seg.p1.almostEqual(end)) {
                                newPoly.push(seg.p2.toLatLon());
                                newPoly.push(seg.p1.toLatLon());
                            }
                            else {
                                newPoly.push(seg.p1.toLatLon());
                                newPoly.push(seg.p2.toLatLon());
                            }
                            if (! (seg.p1.almostEqual(end) || seg.p2.almostEqual(end)))
                            { // isolated segment fragment
                                ll_arrays.push(newPoly);
                                newPoly = [];
                            }
                        }
                    }
                }
                if (newPoly.length)
                    ll_arrays.push(newPoly);
            }
            else if (len == 1) {
                if (this.contains(ll_array[0]))
                    ll_arrays.push(point_array);
            }
        }
        return ll_arrays;
    },

    getCenter: function () {
        //can't use midpoint between southwest and northeast because the calculation along the "Great circle" can potentially put it way out there.
        var lat = this.southwest.lat() + Math.abs(this.northeast.lat() - this.southwest.lat()) / 2.0;
        var lng = this.southwest.lon() + Math.abs(this.northeast.lon() - this.southwest.lon()) / 2.0;
        return new LatLon(lat, lng);
    },

    toString: function () {
        var ret = "((";
        ret += this.southwest.lat();
        ret += ',' + this.southwest.lon();
        ret += '),(' + this.northeast.lat();
        ret += ',' + this.northeast.lon();
        ret += "))";
        return ret;
    }
};

