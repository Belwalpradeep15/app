/*
 * FILENAME:    types.js
 * AUTHOR:      Steven Klassen
 * CREATED ON:  2009-03-26
 *
 * LAST CHANGE:
 * $Author$
 *   $Date$
 *    $Rev$
 *    $URL$
 *
 * COPYRIGHT:
 * This file is Copyright (c) 2009 Fotech Solutions Ltd. All rights reserved.
 */

/**
 * @fileoverview Javascript data types related to fibres.
 */

/** Fotech namespace. */
var fotech = (fotech ? fotech : {});

/** Fotech fibre namespace. */
fotech.fibre = (fotech.fibre ? fotech.fibre : {});


/**
 * Construct a fibre shot.
 * @constructor
 * @param xml An XML description of a fibre shot. (optional) The XML must be a FibreShot
 *    element as described in the types-0.1.xsd schema.
 *
 * @class
 * Describes a single fibre shot.
 */
fotech.fibre.FibreShot = function(xml) {
    this.id = null;
    this.fibreLineId = null;
    this.eventId = null;
    this.startingPosition = null;
    this.binSize = null;
    this.time = null;
    this.amplitudes = [];
    this.relativeClickPoint = null;

    if (typeof(xml) != 'undefined')
        this._initFromXML(xml);
}

/**
 * Create a fibre shot from a JSON description.
 */
fotech.fibre.FibreShot.createFromJSON = function(json) {
    var fs = new fotech.fibre.FibreShot();
    fs.id = (json.id == 0 ? null : json.id);
    fs.fibreLineId = json.fibre_line_id;
    fs.eventId = (json.event_id == 0 ? null : json.event_id);
    fs.startingPosition = json.starting_position;
    fs.binSize = json.bin_size;
    fs.time = Date.parseXMLDateTime(json.time);
    fs.amplitudes = json.amplitudes;
    return fs;
}

// Initialize from an XML description.
fotech.fibre.FibreShot.prototype._initFromXML = function(xml) {
    this.id = parseInt(xml.getAttribute('fibre-shot-id'));
    this.fibreLineId = parseInt(xml.getElementsByTagName('Source')[0].getAttribute('fibre-line-id'));
    this.startingPosition = parseFloat(xml.getTextByTagName('StartingPosition'));
    this.binSize = parseFloat(xml.getTextByTagName('BinSize'));
    this.time = Date.parseXMLDateTime(xml.getTextByTagName('Time'));
    this.amplitudes = xml.getElementsByTagName('Amplitudes')[0].getElementsByTagName('Float-1D')[0].getFloat1D();

    var tmp = xml.getElementsByTagName('EventRef');
    if (tmp != null && tmp.length > 0)
        this.eventId = parseInt(tmp[0].getAttribute('event-id'));
}

/**
 * Get the ending position of the fibre shot. This assumes that startingPosition, binSize,
 * and amplitudes have been set.
 * @return the ending position in metres.
 */
fotech.fibre.FibreShot.prototype.getEndingPosition = function() {
    return this.startingPosition + this.getLength();
}

fotech.fibre.FibreShot.prototype.getLength = function() {
  return (this.amplitudes.length * this.binSize);
};

fotech.fibre.FibreShot.prototype._getClickPointInMeters = function() {
  return (this.getLength() * this.relativeClickPoint) + this.startingPosition;
};

/**
 * Given a start and an ending position (distance on the fibre in metres) return an array
 * of fibre shot bins containing the range. Each object in the returned array will have
 * the following attributes set:
 *  index - the index of the bin in the amplitudes array.
 *  amplitude - the amplitude of that bin.
 *  centrePosition - the position of the centre of the bin (distance on the fibre in metres).
 *
 * @param start The starting position in metres.
 * @param end The ending position in metres.
 * @return an array of fibre shot bins or null if there are none.
 */
fotech.fibre.FibreShot.prototype.getBinsInRange = function(start, end) {
    // Case one, the range does not include any bins.
    if (start > end)
        throw "The starting position must be less than the ending position. (start=" + start + ", end=" + end + ").";
    var endingPosition = this.getEndingPosition();
    if (start > endingPosition || end < this.startingPosition)
        return null;

    // Case two, the range includes only one bin.
    var startIdx = 0;
    if (start > this.startingPosition)
        startIdx = Math.floor((start - this.startingPosition) / this.binSize);
    var endIdx = this.amplitudes.length - 1;
    if (end < endingPosition)
        endIdx = Math.floor((end - this.startingPosition) / this.binSize);
    if (startIdx == endIdx)
        return [ { index: startIdx, amplitude: this.amplitudes[startIdx], centrePosition: this._getCentre(startIdx) } ];

    // General case, the range includes multiple bins.
    var ret = [];
    for (var i = startIdx; i <= endIdx; ++i)
        ret[ret.length] = { index: i, amplitude: this.amplitudes[i], centrePosition: this._getCentre(i) };
    return ret;
}

// Return the centre position of a bin.
fotech.fibre.FibreShot.prototype._getCentre = function(idx) {
    return this.startingPosition + (idx * this.binSize) + (this.binSize / 2.0);
}

/**
 * Calculates the velocity in meters per second
 *
 */
fotech.fibre.FibreShot.prototype.velocity = function(fibreShot) {
  var distance = fibreShot._getClickPointInMeters() - this._getClickPointInMeters();
  var time = (fibreShot.time.getTime() - this.time.getTime()) / 1000;
  return distance/time;
}



/**
 * Construct a class for dealing with section calibrations.
 * @constructor
 * @param xml (optional) If specified should be an XML element representation of the calibration.
 *
 * @class
 * Describe a set of section calibrations. This class is used both to represent the
 * calibration points in a section (engineering diagram) calibration as well as to
 * return an x and y offset given a fibre line distance.
 */
    fotech.fibre.SectionCalibration = function(xml) {
    this._points = [];
    this._nextUniqueId = 1;
    if (xml && xml.getElementsByTagName("FibreDistances").length > 0) {
        var distances = xml.getElementsByTagName("FibreDistances")[0].getElementsByTagName("Float-1D")[0].getFloat1D();
        var xoffsets = xml.getElementsByTagName("XOffsets")[0].getElementsByTagName("Float-1D")[0].getFloat1D();
        var yoffsets = xml.getElementsByTagName("YOffsets")[0].getElementsByTagName("Float-1D")[0].getFloat1D();
        this._addPoints(distances, xoffsets, yoffsets);
    }
}

// Add the calibration points.
fotech.fibre.SectionCalibration.prototype._addPoints = function(distances, xoffsets, yoffsets) {
    if (distances == null)
        return;
    if ((distances.length != xoffsets.length) || (distances.length != yoffsets.length))
        throw "FibreDistances, XOffsets, and YOffsets must all have the same number of values.";
    for (var i = 0; i < distances.length; ++i)
        this.addCalibrationPoint(distances[i], xoffsets[i], yoffsets[i]);
}

/**
 * Create a section calibration from a JSON description.
 */
fotech.fibre.SectionCalibration.createFromJSON = function(json) {
    var sc = new fotech.fibre.SectionCalibration();
    if (json != null) {
        var scj = json;
        sc._addPoints(scj.fibre_distances, scj.x_offsets, scj.y_offsets);
    }
    return sc;
}

/**
 * Add a calibration point.
 * @param fibreDistance the distance on the fibre in metres. If null a distance will be computed
 *     using the getDistance(x, y) method.
 * @param xOffset       the x offset from the origin of the diagram in pixels.
 * @param yOffset       the y offset from the origin of the diagram in pixels.
 * @return the new calibration point.
 */
fotech.fibre.SectionCalibration.prototype.addCalibrationPoint = function(fibreDistance, xOffset, yOffset) {
    if (fibreDistance == null)
        fibreDistance = this.getDistance(xOffset, yOffset);

    var matchingPoint = this._points.find(function(point){
        return point.x == xOffset && point.y == yOffset;
    });

    if(matchingPoint){
        return null;
    }
    else {
        var point = { distance: fibreDistance, x: xOffset, y: yOffset, id: this._nextUniqueId++ };
        this._points[this._preparePositionForInsert(fibreDistance)] = point;
        return point;
    }
}

/**
 * Return an array of all the calibration points. Each point is a object with the
 * attributes 'distance', 'x', and 'y' corresponding to the fibre distance (in metres)
 * and the x and y offsets (in pixels). You should treat the array as read-only.
 *
 * You may assume that this will never return null but it may return an empty array.
 *
 * @return the calibration points.
 */
fotech.fibre.SectionCalibration.prototype.getCalibrationPoints = function() {
    return this._points;
}

/**
 * Remove a calibration point.
 * @param point The calibration point to remove.
 * @return true if the point was removed, false if it was not in this calibration.
 */
fotech.fibre.SectionCalibration.prototype.removeCalibrationPoint = function(point) {
    var stop = this._points.length - 1;
    var found = false;
    for (var i = 0; i < stop; ++i) {
        if (this._points[i] === point)
            found = true;
        if (found)
            this._points[i] = this._points[i+1];
    }
    if (found || this._points[stop] === point) {
        this._points.length = this._points.length - 1;
        found = true;
    }
    return found;
}

/**
 * Return the index of the control point or null if it is not part of this calibration.
 * @param point the control point to examine.
 * @return the index of the control point.
 */
fotech.fibre.SectionCalibration.prototype.getIndex = function(point) {
    for (var i = 0; i < this._points.length; ++i) {
        if (this._points[i].id == point.id)
            return i;
    }
    return null;
}

/**
 * Return the x and y offsets corresponding to the given fibre length. The object returned
 * will have the attributes 'distance', 'x', and 'y' as described for getCalibrationPoints.
 * You should treat the returned object as read only.
 *
 * @param distance The position on the fibre in metres.
 * @return a point describing the position on the fibre in terms of the engineering diagram.
 *      Returns null iff there are no calibration points.
 */
fotech.fibre.SectionCalibration.prototype.getPosition = function(distance) {
    if (this._points.length == 0)
        return null;

    // Case one: the distance is exactly one of our control points or is off one of the ends.
    var pos = this._findPosition(distance);
    if (pos.isExact || pos.idx <= 0 || pos.idx >= this._points.length)
        return this._points[pos.idx];

    // Case two: we must interpolate between two points.
    var p1 = this._points[pos.idx-1];
    var p2 = this._points[pos.idx];
    var perc = (distance - p1.distance) / (p2.distance - p1.distance);
    var x = p1.x + (perc * (p2.x - p1.x));
    var y = p1.y + (perc * (p2.y - p1.y));
    return { distance: distance, x: x, y: y };
}

/**
 * Return the fibre distance in metres given an x, y position. This will find the closest
 * point on the line segment for the given x, y and return it.
 *
 * @param x offset in pixels
 * @param y offset in pixels
 */
fotech.fibre.SectionCalibration.prototype.getDistance = function(x, y) {
    if (this._points.length == 0)
        return 0;
    else if (this._points.length == 1)
        return this._points[0].distance + 100.0;
    else {
        var p = new fotech.geom.Point(x, y);
        var dist, minDist = Number.MAX_VALUE;
        var p0, p2, minPoint = new fotech.geom.Point(this._points[0].x, this._points[0].y);
        var p1 = minPoint;
        p1.distance = this._points[0].distance;
        for (var i = 1; i < this._points.length; ++i) {
            p2 = new fotech.geom.Point(this._points[i].x, this._points[i].y);
            p2.distance = this._points[i].distance;
            p0 = p.closestPoint(new fotech.geom.Segment(p1, p2));
            dist = p.distanceTo(p0);
            if (dist < minDist) {
                minDist = dist;
                minPoint = p0;
                if (!p0.distance)
                    p0.distance = p1.distance + (p1.distanceTo(p0) / p1.distanceTo(p2)) * (p2.distance - p1.distance);
            }
            p1 = p2;
        }
        if (minPoint.distance == this._points[this._points.length-1].distance)
            minPoint.distance += 10.0;
        return minPoint.distance;
    }
}

// Find the position for a given distance. The returned object will contain isExact set to true
// if the distance is an exact match and false if it is not. It will also contain idx which
// will be the index of the control point if we had an exact match or the index where the new
// control point should be inserted if we do not have an exact match.
fotech.fibre.SectionCalibration.prototype._findPosition = function(distance) {
    for (var i = 0; i < this._points.length; ++i) {
        if (distance == this._points[i].distance)
            return { isExact: true, idx: i };
        else if (distance > this._points[i].distance)
            continue;
        return { isExact: false, idx: i };
    }
    return { isExact: false, idx: this._points.length };
}

// Prepare a position for inserting a control point at the given distance. This will determine
// the correct position and move the elements that need to be moved. Then the position index will
// be returned.
fotech.fibre.SectionCalibration.prototype._preparePositionForInsert = function(distance) {
    var pos = this._findPosition(distance).idx;
    var len = this._points.length;
    for (var i = len; i > pos; --i)
        this._points[i] = this._points[i-1];
    return pos;
}

fotech.fibre.SectionCalibration.prototype.getMinDistance = function(){
    return this._points[0].distance;
}

fotech.fibre.SectionCalibration.prototype.getMaxDistance = function(){
    return this._points[this._points.length - 1].distance;
}
