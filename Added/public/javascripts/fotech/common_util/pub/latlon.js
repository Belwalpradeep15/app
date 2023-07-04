/* - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -  */
/*  Latitude/longitude spherical geodesy formulae & scripts (c) Chris Veness 2002-2012            */
/*   - www.movable-type.co.uk/scripts/latlong.html                                                */
/*                                                                                                */
/*  Sample usage:                                                                                 */
/*    var p1 = new LatLon(51.5136, -0.0983);                                                      */
/*    var p2 = new LatLon(51.4778, -0.0015);                                                      */
/*    var dist = p1.distanceTo(p2);          // in km                                             */
/*    var brng = p1.bearingTo(p2);           // in degrees clockwise from north                   */
/*    ... etc                                                                                     */
/* - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -  */

/* - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -  */
/*  Note that minimal error checking is performed in this example code!                           */
/*  Note that this is not stock and has been heavily modified by fotech                           */
/* - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -  */


/**
 * @requires Geo
 */


/**
 * Creates a point on the earth's surface at the supplied latitude / longitude
 *
 * @constructor
 * @param {Number} lat: latitude in numeric degrees
 * @param {Number} lon: longitude in numeric degrees
 * @param {Number} [rad=6371]: radius of earth if different value is required from standard 6,371km
 */
function LatLon(lat, lon, rad) {
    if (typeof(rad) == 'undefined') rad = 6370986;  // earth's mean radius in m. This is the value
                                                    // used in PostGIS so do not change this or we
                                                    // will have a discrepancy between the chainage
                                                    // values in the display and those attached
                                                    // to the events and alarms.

    // only accept numbers or valid numeric strings
    this._lat = typeof(lat) == 'number' ? lat : typeof(lat) == 'string' && lat.trim() != '' ? +lat : NaN;
    if (isNaN(this._lat)) {
        this._lat = Geo.parseDMS(lat);
    }

    this._lon = typeof(lon) == 'number' ? lon : typeof(lon) == 'string' && lon.trim() != '' ? +lon : NaN;
    if (isNaN(this._lon)) {
        this._lon = Geo.parseDMS(lon);
    }
    this._radius = typeof(rad) == 'number' ? rad : typeof(rad) == 'string' && trim(lon) != '' ? +rad : NaN;
}

LatLon.prototype = {
    isValid: function (field) {
        var latValid = !isNaN(this._lat) && (this._lat >= -90 && this._lat <= 90),
            longValid = !isNaN(this._lon) &&(this._lon >= -180 && this._lon <= 180);
        switch (field) {
            case 'latitude':
            case 'lat':
                return latValid;

            case 'longitude':
            case 'long':
            case 'lng':
                return longValid;
        }
        return  latValid && longValid;
    },

    /**
     * Returns the distance from this point to the supplied point, in m
     * (using Haversine formula)
     *
     * from: Haversine formula - R. W. Sinnott, "Virtues of the Haversine",
     *       Sky and Telescope, vol 68, no 2, 1984
     *
     * @param   {LatLon} point: Latitude/longitude of destination point
     * @param   {Number} [precision=4]: no of significant digits to use for returned value
     * @returns {Number} Distance in m between this point and destination point
     */
    distanceTo: function (point, precision) {
        // default 4 sig figs reflects typical 0.3% accuracy of spherical model
        if (typeof precision == 'undefined') precision = 4;

        var R = this._radius;
        var lat1 = this._lat.toRad(), lon1 = this._lon.toRad();
        var lat2 = point._lat.toRad(), lon2 = point._lon.toRad();
        var dLat = lat2 - lat1;
        var dLon = lon2 - lon1;

        var a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat1) * Math.cos(lat2) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
        var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        var d = R * c;
        return parseFloat(d.toPrecisionFixed(precision));
    },


    /**
     * Returns the (initial) bearing from this point to the supplied point, in degrees
     *   see http://williams.best.vwh.net/avform.htm#Crs
     *
     * @param   {LatLon} point: Latitude/longitude of destination point
     * @returns {Number} Initial bearing in degrees from North
     */
    bearingTo: function (point) {
        var lat1 = this._lat.toRad(), lat2 = point._lat.toRad();
        var dLon = (point._lon - this._lon).toRad();

        var y = Math.sin(dLon) * Math.cos(lat2);
        var x = Math.cos(lat1) * Math.sin(lat2) -
            Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLon);
        var brng = Math.atan2(y, x);

        return (brng.toDeg() + 360) % 360;
    },


    /**
     * Returns final bearing arriving at supplied destination point from this point; the final bearing
     * will differ from the initial bearing by varying degrees according to distance and latitude
     *
     * @param   {LatLon} point: Latitude/longitude of destination point
     * @returns {Number} Final bearing in degrees from North
     */
    finalBearingTo: function (point) {
        // get initial bearing from supplied point back to this point...
        var brng = point.bearingTo(this);
        // ... & reverse it by adding 180°
        return (brng.toDeg() + 180) % 360;
    },


    /**
     * Returns the midpoint between this point and the supplied point.
     *   see http://mathforum.org/library/drmath/view/51822.html for derivation
     *
     * @param   {LatLon} point: Latitude/longitude of destination point
     * @returns {LatLon} Midpoint between this point and the supplied point
     */
    midpointTo: function (point) {
        var lat1 = this._lat.toRad(), lon1 = this._lon.toRad();
        var lat2 = point._lat.toRad();
        var dLon = (point._lon - this._lon).toRad();

        var Bx = Math.cos(lat2) * Math.cos(dLon);
        var By = Math.cos(lat2) * Math.sin(dLon);

        var lat3 = Math.atan2(Math.sin(lat1) + Math.sin(lat2),
            Math.sqrt((Math.cos(lat1) + Bx) * (Math.cos(lat1) + Bx) + By * By));
        var lon3 = lon1 + Math.atan2(By, Math.cos(lat1) + Bx);
        var lon3 = (lon3 + 3 * Math.PI) % (2 * Math.PI) - Math.PI;  // normalise to -180..+180º

        return new LatLon(lat3.toDeg(), lon3.toDeg());
    },


    /**
     * Returns the destination point from this point having travelled the given distance (in m) on the
     * given initial bearing (bearing may vary before destination is reached)
     *
     *   see http://williams.best.vwh.net/avform.htm#LL
     *
     * @param   {Number} brng: Initial bearing in degrees
     * @param   {Number} dist: Distance in m
     * @returns {LatLon} Destination point
     */
    destinationPoint: function (brng, dist) {
        dist = typeof(dist) == 'number' ? dist : typeof(dist) == 'string' && dist.trim() != '' ? +dist : NaN;
        dist = dist / this._radius;  // convert dist to angular distance in radians
        brng = brng.toRad();  //
        var lat1 = this._lat.toRad(), lon1 = this._lon.toRad();

        var lat2 = Math.asin(Math.sin(lat1) * Math.cos(dist) +
            Math.cos(lat1) * Math.sin(dist) * Math.cos(brng));
        var lon2 = lon1 + Math.atan2(Math.sin(brng) * Math.sin(dist) * Math.cos(lat1),
                Math.cos(dist) - Math.sin(lat1) * Math.sin(lat2));
        lon2 = (lon2 + 3 * Math.PI) % (2 * Math.PI) - Math.PI;  // normalise to -180..+180º

        return new LatLon(lat2.toDeg(), lon2.toDeg());
    },

    /**
     * Returns the point at given fraction between ‘this’ point and specified point.
     *
     * @param   {LatLon} point - Latitude/longitude of destination point.
     * @param   {number} fraction - Fraction between the two points (0 = this point, 1 = specified point).
     * @returns {LatLon} Intermediate point between this point and destination point.
     *
     * @example
     *   let p1 = new LatLon(52.205, 0.119);
     *   let p2 = new LatLon(48.857, 2.351);
     *   let pMid = p1.intermediatePointTo(p2, 0.25); // 51.3721°N, 000.7073°E
     */
    intermediatePointTo: function (point, fraction) {
        if (!(point instanceof LatLon)) throw new TypeError('point is not LatLon object');

        // Check a boundary case, if the two points are equal, or nearly equal, then all the intermediate points are the same.
        if (this.distanceTo(point) < 0.0000001) {
            return this;
        }

        var φ1 = this._lat.toRad(), λ1 = this._lon.toRad();
        var φ2 = point._lat.toRad(), λ2 = point._lon.toRad();
        var sinφ1 = Math.sin(φ1), cosφ1 = Math.cos(φ1), sinλ1 = Math.sin(λ1), cosλ1 = Math.cos(λ1);
        var sinφ2 = Math.sin(φ2), cosφ2 = Math.cos(φ2), sinλ2 = Math.sin(λ2), cosλ2 = Math.cos(λ2);

        // distance between points
        var Δφ = φ2 - φ1;
        var Δλ = λ2 - λ1;
        var a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2)
            + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
        var δ = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

        var A = Math.sin((1 - fraction) * δ) / Math.sin(δ);
        var B = Math.sin(fraction * δ) / Math.sin(δ);

        var x = A * cosφ1 * cosλ1 + B * cosφ2 * cosλ2;
        var y = A * cosφ1 * sinλ1 + B * cosφ2 * sinλ2;
        var z = A * sinφ1 + B * sinφ2;

        var φ3 = Math.atan2(z, Math.sqrt(x * x + y * y));
        var λ3 = Math.atan2(y, x);

        return new LatLon(φ3.toDeg(), (λ3.toDeg() + 540) % 360 - 180); // normalise lon to −180..+180°
    },


    /**
     * Returns the point of intersection of two paths defined by point and bearing
     *
     *   see http://williams.best.vwh.net/avform.htm#Intersection
     *
     * @param   {LatLon} p1: First point
     * @param   {Number} brng1: Initial bearing from first point
     * @param   {LatLon} p2: Second point
     * @param   {Number} brng2: Initial bearing from second point
     * @returns {LatLon} Destination point (null if no unique intersection defined)
     */
    intersection: function (p1, brng1, p2, brng2) {
        brng1 = typeof brng1 == 'number' ? brng1 : typeof brng1 == 'string' && trim(brng1) != '' ? +brng1 : NaN;
        brng2 = typeof brng2 == 'number' ? brng2 : typeof brng2 == 'string' && trim(brng2) != '' ? +brng2 : NaN;
        var lat1 = p1._lat.toRad(), lon1 = p1._lon.toRad();
        var lat2 = p2._lat.toRad(), lon2 = p2._lon.toRad();
        var brng13 = brng1.toRad(), brng23 = brng2.toRad();
        var dLat = lat2 - lat1, dLon = lon2 - lon1;

        var dist12 = 2 * Math.asin(Math.sqrt(Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) * Math.sin(dLon / 2)));
        if (dist12 == 0) return null;

        // initial/final bearings between points
        var brngA = Math.acos(( Math.sin(lat2) - Math.sin(lat1) * Math.cos(dist12) ) /
            ( Math.sin(dist12) * Math.cos(lat1) ));
        if (isNaN(brngA)) brngA = 0;  // protect against rounding
        var brngB = Math.acos(( Math.sin(lat1) - Math.sin(lat2) * Math.cos(dist12) ) /
            ( Math.sin(dist12) * Math.cos(lat2) ));

        if (Math.sin(lon2 - lon1) > 0) {
            var brng12 = brngA;
            var brng21 = 2 * Math.PI - brngB;
        } else {
            brng12 = 2 * Math.PI - brngA;
            brng21 = brngB;
        }

        var alpha1 = (brng13 - brng12 + Math.PI) % (2 * Math.PI) - Math.PI;  // angle 2-1-3
        var alpha2 = (brng21 - brng23 + Math.PI) % (2 * Math.PI) - Math.PI;  // angle 1-2-3

        if (Math.sin(alpha1) == 0 && Math.sin(alpha2) == 0) return null;  // infinite intersections
        if (Math.sin(alpha1) * Math.sin(alpha2) < 0) return null;       // ambiguous intersection

        //alpha1 = Math.abs(alpha1);
        //alpha2 = Math.abs(alpha2);
        // ... Ed Williams takes abs of alpha1/alpha2, but seems to break calculation?

        var alpha3 = Math.acos(-Math.cos(alpha1) * Math.cos(alpha2) +
            Math.sin(alpha1) * Math.sin(alpha2) * Math.cos(dist12));
        var dist13 = Math.atan2(Math.sin(dist12) * Math.sin(alpha1) * Math.sin(alpha2),
            Math.cos(alpha2) + Math.cos(alpha1) * Math.cos(alpha3));
        var lat3 = Math.asin(Math.sin(lat1) * Math.cos(dist13) +
            Math.cos(lat1) * Math.sin(dist13) * Math.cos(brng13));
        var dLon13 = Math.atan2(Math.sin(brng13) * Math.sin(dist13) * Math.cos(lat1),
            Math.cos(dist13) - Math.sin(lat1) * Math.sin(lat3));
        var lon3 = lon1 + dLon13;
        lon3 = (lon3 + 3 * Math.PI) % (2 * Math.PI) - Math.PI;  // normalise to -180..+180º

        return new LatLon(lat3.toDeg(), lon3.toDeg());
    },


    /**
     * Cross Track distance.  distance to closest point on a line given start and end of line. This will be signed based on what side of the track the point exists
     */
    directionalDistanceToLine: function (start, end) {
        var R = this._radius;
        var d13 = start.distanceTo(this);
        var brng13 = start.bearingTo(this).toRad();
        var brng12 = start.bearingTo(end).toRad();

        var delta_start_bearing = brng13 - brng12;

        return Math.asin(Math.sin(d13 / R) * Math.sin(delta_start_bearing)) * R;
    },
    /**
     * Returns the absolute distance from the point to the closest point on the track specified by start and end
     */
    distanceToLine: function (start, end) {
        return Math.abs(this.directionalDistanceToLine(start, end));
    },

    /**
     * Finds distance along the given path that is closest to the point
     */
    distanceAlongLine: function (start, end) {
        var R = this._radius;
        var d13 = start.distanceTo(this);
        var dXt = this.directionalDistanceToLine(start, end);

        return Math.acos(Math.cos(d13 / R) / Math.cos(dXt / R)) * R;
    },

    /**
     * Returns closest latlon on track
     * Note that if its off the end of the line segment, then we
     * only want to return the closest end.
     */
    closestPointOnSegment: function (start, end) {
        var brng12 = start.bearingTo(end);
        var brng13 = start.bearingTo(this);
        var brng23 = end.bearingTo(this);
        var delta_start_bearing = brng13 - brng12;
        var delta_end_bearing = brng23 - brng12;

        if (delta_start_bearing > 90 || delta_start_bearing < -90)
            return start;
        if (delta_end_bearing > -90 && delta_end_bearing < 90)
            return end;
        var distance = this.distanceAlongLine(start, end);
        return start.destinationPoint(brng12, distance);
    },


    /* - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -  */

    /**
     * Returns the distance from this point to the supplied point, in m, travelling along a rhumb line
     *
     *   see http://williams.best.vwh.net/avform.htm#Rhumb
     *
     * @param   {LatLon} point: Latitude/longitude of destination point
     * @returns {Number} Distance in km between this point and destination point
     */
    rhumbDistanceTo: function (point) {
        var R = this._radius;
        var lat1 = this._lat.toRad(), lat2 = point._lat.toRad();
        var dLat = (point._lat - this._lat).toRad();
        var dLon = Math.abs(point._lon - this._lon).toRad();

        var dPhi = Math.log(Math.tan(lat2 / 2 + Math.PI / 4) / Math.tan(lat1 / 2 + Math.PI / 4));
        var q = (isFinite(dLat / dPhi)) ? dLat / dPhi : Math.cos(lat1);  // E-W line gives dPhi=0

        // if dLon over 180° take shorter rhumb across anti-meridian:
        if (Math.abs(dLon) > Math.PI) {
            dLon = dLon > 0 ? -(2 * Math.PI - dLon) : (2 * Math.PI + dLon);
        }

        var dist = Math.sqrt(dLat * dLat + q * q * dLon * dLon) * R;

        return parseFloat(dist.toPrecisionFixed(4));  // 4 sig figs reflects typical 0.3% accuracy of spherical model
    },

    /**
     * Returns the bearing from this point to the supplied point along a rhumb line, in degrees
     *
     * @param   {LatLon} point: Latitude/longitude of destination point
     * @returns {Number} Bearing in degrees from North
     */
    rhumbBearingTo: function (point) {
        var lat1 = this._lat.toRad(), lat2 = point._lat.toRad();
        var dLon = (point._lon - this._lon).toRad();

        var dPhi = Math.log(Math.tan(lat2 / 2 + Math.PI / 4) / Math.tan(lat1 / 2 + Math.PI / 4));
        if (Math.abs(dLon) > Math.PI) dLon = dLon > 0 ? -(2 * Math.PI - dLon) : (2 * Math.PI + dLon);
        var brng = Math.atan2(dLon, dPhi);

        return (brng.toDeg() + 360) % 360;
    },

    /**
     * Returns the destination point from this point having travelled the given distance (in km) on the
     * given bearing along a rhumb line
     *
     * @param   {Number} brng: Bearing in degrees from North
     * @param   {Number} dist: Distance in km
     * @returns {LatLon} Destination point
     */
    rhumbDestinationPoint: function (brng, dist) {
        var R = this._radius;
        var d = parseFloat(dist) / R;  // d = angular distance covered on earth’s surface
        var lat1 = this._lat.toRad(), lon1 = this._lon.toRad();
        brng = brng.toRad();

        var dLat = d * Math.cos(brng);
        // nasty kludge to overcome ill-conditioned results around parallels of latitude:
        if (Math.abs(dLat) < 1e-10) dLat = 0; // dLat < 1 mm

        var lat2 = lat1 + dLat;
        var dPhi = Math.log(Math.tan(lat2 / 2 + Math.PI / 4) / Math.tan(lat1 / 2 + Math.PI / 4));
        var q = (isFinite(dLat / dPhi)) ? dLat / dPhi : Math.cos(lat1);  // E-W line gives dPhi=0
        var dLon = d * Math.sin(brng) / q;

        // check for some daft bugger going past the pole, normalise latitude if so
        if (Math.abs(lat2) > Math.PI / 2) lat2 = lat2 > 0 ? Math.PI - lat2 : -Math.PI - lat2;

        var lon2 = (lon1 + dLon + 3 * Math.PI) % (2 * Math.PI) - Math.PI;

        return new LatLon(lat2.toDeg(), lon2.toDeg());
    },

    /**
     * Returns the loxodromic midpoint (along a rhumb line) between this point and the supplied point.
     *   see http://mathforum.org/kb/message.jspa?messageID=148837
     *
     * @param   {LatLon} point: Latitude/longitude of destination point
     * @returns {LatLon} Midpoint between this point and the supplied point
     */
    rhumbMidpointTo: function (point) {
        var lat1 = this._lat.toRad(), lon1 = this._lon.toRad();
        var lat2 = point._lat.toRad(), lon2 = point._lon.toRad();

        if (Math.abs(lon2 - lon1) > Math.PI) lon1 += 2 * Math.PI; // crossing anti-meridian

        var lat3 = (lat1 + lat2) / 2;
        var f1 = Math.tan(Math.PI / 4 + lat1 / 2);
        var f2 = Math.tan(Math.PI / 4 + lat2 / 2);
        var f3 = Math.tan(Math.PI / 4 + lat3 / 2);
        var lon3 = ( (lon2 - lon1) * Math.log(f3) + lon1 * Math.log(f2) - lon2 * Math.log(f1) ) / Math.log(f2 / f1);

        if (!isFinite(lon3)) lon3 = (lon1 + lon2) / 2; // parallel of latitude

        lon3 = (lon3 + 3 * Math.PI) % (2 * Math.PI) - Math.PI;  // normalise to -180..+180º

        return new LatLon(lat3.toDeg(), lon3.toDeg());
    },
    /* - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -  */


    /**
     * Returns the latitude of this point; signed numeric degrees if no format, otherwise format & dp
     * as per Geo.toLat()
     *
     * @param   {String} [format]: Return value as 'd', 'dm', 'dms'
     * @param   {Number} [dp=0|2|4]: No of decimal places to display
     * @returns {Number|String} Numeric degrees if no format specified, otherwise deg/min/sec
     */
    lat: function (format, dp) {
        if (typeof format == 'undefined') return this._lat;

        return Geo.toLat(this._lat, format, dp);
    },

    /**
     * Returns the longitude of this point; signed numeric degrees if no format, otherwise format & dp
     * as per Geo.toLon()
     *
     * @param   {String} [format]: Return value as 'd', 'dm', 'dms'
     * @param   {Number} [dp=0|2|4]: No of decimal places to display
     * @returns {Number|String} Numeric degrees if no format specified, otherwise deg/min/sec
     */
    lon: function (format, dp) {
        if (typeof format == 'undefined') return this._lon;

        return Geo.toLon(this._lon, format, dp);
    },

    /**
     * Returns a string representation of this point; format and dp as per lat()/lon()
     *
     * @param   {String} [format]: Return value as 'd', 'dm', 'dms'
     * @param   {Number} [dp=0|2|4]: No of decimal places to display
     * @returns {String} Comma-separated latitude/longitude
     */
    toString: function (format, dp) {
        if (typeof format == 'undefined') format = 'dms';

        return Geo.toLat(this._lat, format, dp) + ', ' + Geo.toLon(this._lon, format, dp);
    },

    toPoint: function() {
        return new fotech.geom.Point(this._lat, this._lon);
    }
};
/* - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -  */

// ---- extend Number object with methods for converting degrees/radians

/** Converts numeric degrees to radians */
if (typeof Number.prototype.toRad == 'undefined') {
    Number.prototype.toRad = function () {
        return this * Math.PI / 180;
    }
}

/** Converts radians to numeric (signed) degrees */
if (typeof Number.prototype.toDeg == 'undefined') {
    Number.prototype.toDeg = function () {
        return this * 180 / Math.PI;
    }
}

/**
 * Formats the significant digits of a number, using only fixed-point notation (no exponential)
 *
 * @param   {Number} precision: Number of significant digits to appear in the returned string
 * @returns {String} A string representation of number which contains precision significant digits
 */
if (typeof Number.prototype.toPrecisionFixed == 'undefined') {
    Number.prototype.toPrecisionFixed = function (precision) {

        // use standard toPrecision method
        var n = this.toPrecision(precision);

        // ... but replace +ve exponential format with trailing zeros
        n = n.replace(/(.+)e\+(.+)/, function (n, sig, exp) {
            sig = sig.replace(/\./, '');       // remove decimal from significand
            var l = sig.length - 1;
            while (exp-- > l) sig = sig + '0'; // append zeros from exponent
            return sig;
        });

        // ... and replace -ve exponential format with leading zeros
        n = n.replace(/(.+)e-(.+)/, function (n, sig, exp) {
            sig = sig.replace(/\./, '');       // remove decimal from significand
            while (exp-- > 1) sig = '0' + sig; // prepend zeros from exponent
            return '0.' + sig;
        });

        return n;
    }
}

/** Trims whitespace from string (q.v. blog.stevenlevithan.com/archives/faster-trim-javascript) */
if (typeof String.prototype.trim == 'undefined') {
    String.prototype.trim = function () {
        return String(this).replace(/^\s\s*/, '').replace(/\s\s*$/, '');
    }
}


/* - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -  */
if (!window.console) window.console = {
    log: function () {
    }
};
