/*
 * FILENAME:    geometry.js
 * AUTHOR:      Steven Klassen
 * CREATED ON:  2009-03-06
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
 * @fileoverview Geometrical routines.
 */

/** Fotech namespace. */
var fotech = (fotech ? fotech : {});

/** Fotech geom namespace. */
fotech.geom = (fotech.geom ? fotech.geom : {});


/**
 * Construct a point.
 * @constructor
 * @param x The x value.
 * @param y The y value.
 *
 * @class
 * The Point class represents a point as an x and y value.
 */
fotech.geom.Point = function(x, y) {
    this.x = x;
    this.y = y;
};

fotech.geom.Point.prototype = {
    /**
     * Set the point from the values of another point.
     * @param p the point to copy the values from.
     */
    set: function (p) {
        this.x = p.x;
        this.y = p.y;
    },

    /**
     * Returns true if the point is to the left of the ray defined by the Segment line.
     *
     * This uses an algorithm adapted from COMPUTATIONAL GEOMETRY IN C, by o'Rourke, ISBN 0-521-44034-3.
     * It is a port of some Java code from Klassen Software Solutions.
     *
     * @param line The line defining the ray.
     * @return true if the point is to the left.
     */
    isLeftOf: function (line) {
        return (this.__area2(line.p1, line.p2, this) > 0);
    },

    /**
     * Returns the closest point of the given line segment. Note that this may be one of
     * the endpoints.
     *
     * This is based on an algorithm found at
     * http://local.wasp.uwa.edu.au/~pbourke/geometry/pointline/
     *
     * @param seg The segment we want the closest point for.
     * @return the closest point.
     */
    closestPoint: function (seg) {
        var p1 = seg.p1;
        var p2 = seg.p2;
        var p3 = this;

        var dx = p2.x - p1.x;
        var dy = p2.y - p1.y;
        if ((dx == 0.0) && (dy == 0.0))
            throw "The segment must contain more than a single point.";

        var u = ((p3.x - p1.x) * dx + (p3.y - p1.y) * dy) / (dx * dx + dy * dy);
        var p;
        if (u < 0.0)
            p = p1;
        else if (u > 1.0)
            p = p2;
        else
            p = new fotech.geom.Point(p1.x + u * dx, p1.y + u * dy);
        return p;
    },

    /**
     * Determine the distance between this point and another point.
     * @param p The point we want the distance to.
     * @return the distance.
     */
    distanceTo: function (p) {
        var dx = p.x - this.x;
        var dy = p.y - this.y;
        return Math.sqrt((dx * dx) + (dy * dy));
    },

    almostEqual: function (p, eps) {
        eps = eps || 0.0000001;
        var dx = Math.abs(p.x - this.x);
        var dy = Math.abs(p.y - this.y);
        return dx + dy < eps;
    },

// Returns twice the signed area of the triangle determined by the points a, b, and c.
// This will be positive if a, b, c are oriented counter-clockwise and negative
// if clockwise.
    __area2: function (a, b, c) {
        return ((a.x * b.y) - (a.y * b.x) + (a.y * c.x) - (a.x * c.y) + (b.x * c.y) - (c.x * b.y));
    },

    toLatLon : function() {
        return new LatLon(this.x, this.y);
    }
};


/**
 * Construct a segment.
 * @constructor
 * @param p1 The first point.
 * @param p2 The second point.
 *
 * @class
 * A Segment is represented as two points.
 */
fotech.geom.Segment = function(p1, p2) {
    this.p1 = p1;
    this.p2 = p2;
};

fotech.geom.Segment.prototype = {
    /**
     * Returns the point of intersection between two line segments or null
     * if there is no intersection.
     *
     * This uses an algorithm adapted from Computational Geometry in C by O'Rourke, ISBN 0-521-44034-3.
     * It is a port of some Java code from Klassen Software Solutions.
     *
     * @param seg The segment to intersect.
     * @return the point of intersection or null if there is no intersection.
     */
    intersection: function (seg) {
        // Compute the denominator of the solutions.  If it is zero
        // the segments are parallel and we return that there is no
        // intersection.
        var a = this.p1;
        var b = this.p2;
        var c = seg.p1;
        var d = seg.p2;
        var by_minus_ay = b.y - a.y;
        var denom = a.x * (d.y - c.y) + b.x * (c.y - d.y) + d.x * by_minus_ay + c.x * (a.y - b.y);
        if (denom == 0.0) {
            return null;
        }

        // Compute the parameters of the parametric equations.
        var s = (a.x * (d.y - c.y) + c.x * (a.y - d.y) + d.x * (c.y - a.y)) / denom;
        var t = -(a.x * (c.y - b.y) + b.x * (a.y - c.y) + c.x * by_minus_ay) / denom;

        // Compute the point of intersection and determine if it is
        // in the bounds of our segments.
        if ((0.0 <= s) && (s <= 1.0) && (0.0 <= t) && (t <= 1.0))
            return new fotech.geom.Point(a.x + s * (b.x - a.x), a.y + s * by_minus_ay);

        return null;
    }
};


/**
 * Construct a Rectangle.
 * @constructor
 * @param c1 One corner.
 * @param c2 The other corner.
 *
 * @class
 * A Rectangle is represented by two points defining its opposing corners.
 */
fotech.geom.Rectangle = function(c1, c2) {
    this.c1 = c1;
    this.c2 = c2;
};


fotech.geom.Rectangle.prototype = {
    /**
     * Determine if a segment intersects the rectangle and returns the intersection portion.
     * This uses the Nicholl-Lee-Nicholl algorithm as described in _COMPUTER GRAPHICS:
     * PRINCIPLES AND PRACTICE_, by Foley, vanDam, Feiner, and Hughes, ISBN 0-201-12110-7.
     * The code is also based on a Java implementation from Klassen Software Solutions.
     *
     * Note that to understand the variable names used here you will need to refer to the
     * textbook referenced above.
     *
     * @param seg The segment.
     * @return An intersecting segment or null if there is no intersection.
     */
    intersection: function (seg) {
        // Setup our points so that P is always left of Q.
        var swapped = false;
        var xMin = Math.min(this.c1.x, this.c2.x);
        var xMax = Math.max(this.c1.x, this.c2.x);
        var yMin = Math.min(this.c1.y, this.c2.y);
        var yMax = Math.max(this.c1.y, this.c2.y);
        var P = new fotech.geom.Point(seg.p1.x, seg.p1.y);
        var Q = new fotech.geom.Point(seg.p2.x, seg.p2.y);
        if (P.x > Q.x) {
            var tmp = P;
            P = Q;
            Q = tmp;
            swapped = true;
        }

        // Check for the trivial complete containment case.
        if (xMin <= seg.p1.x && seg.p1.x <= xMax && yMin <= seg.p1.y && seg.p1.y <= yMax
            && xMin <= seg.p2.x && seg.p2.x <= xMax && yMin <= seg.p2.y && seg.p2.y <= yMax)
            return seg;

        // Determine which NLN region P is in.
        var ret = null;
        if (P.x <= xMin) {
            if (P.y <= yMin)
                ret = this.__P_in_LL(P, Q, xMin, xMax, yMin, yMax);
            else if (P.y <= yMax)
                ret = this.__P_in_CL(P, Q, xMin, xMax, yMin, yMax);
            else
                ret = this.__P_in_UL(P, Q, xMin, xMax, yMin, yMax);
        }
        else if (P.x <= xMax) {
            if (P.y <= yMin)
                ret = this.__P_in_LC(P, Q, xMin, xMax, yMin, yMax);
            else if (P.y <= yMax)
                ret = this.__P_in_CC(P, Q, xMin, xMax, yMin, yMax);
            else
                ret = this.__P_in_UC(P, Q, xMin, xMax, yMin, yMax);
        }
        else {
            // No intersection is possible.
            return null;
        }

        if (ret != null && swapped) {
            var tmp = ret.p1;
            ret.p1 = ret.p2;
            ret.p2 = tmp;
        }
        return ret;
    },

// Region 1 - lower left
    __P_in_LL: function (P, Q, xMin, xMax, yMin, yMax) {
        // Perform our trivial checks.
        if ((Q.x <= xMin)
            || (Q.y <= yMin)
            || Q.isLeftOf(new fotech.geom.Segment(P, new fotech.geom.Point(xMin, yMax)))
            || !Q.isLeftOf(new fotech.geom.Segment(P, new fotech.geom.Point(xMax, yMin))))
            return null;

        // P will be on either the left or bottom edge.
        var PQ = new fotech.geom.Segment(P, Q);
        var xy = new fotech.geom.Point(xMin, yMin);
        if (Q.isLeftOf(new fotech.geom.Segment(P, xy)))
            P.set(PQ.intersection(new fotech.geom.Segment(xy, new fotech.geom.Point(xMin, yMax))));
        else
            P.set(PQ.intersection(new fotech.geom.Segment(xy, new fotech.geom.Point(xMax, yMin))));

        // Q will either be on the top edge, the right edge or in the middle
        xy = new fotech.geom.Point(xMax, yMax);
        if (Q.isLeftOf(new fotech.geom.Segment(P, xy))) {
            if (Q.y > yMax)
                Q.set(PQ.intersection(new fotech.geom.Segment(new fotech.geom.Point(xMin, yMax), xy)));
        }
        else {
            if (Q.x > xMax)
                Q.set(PQ.intersection(new fotech.geom.Segment(new fotech.geom.Point(xMax, yMin), xy)));
        }

        return PQ;
    },

// Region 2 - center left
    __P_in_CL: function (P, Q, xMin, xMax, yMin, yMax) {
        // Perform our trivial rejects.
        if ((Q.x <= xMin)
            || Q.isLeftOf(new fotech.geom.Segment(P, new fotech.geom.Point(xMin, yMax)))
            || !Q.isLeftOf(new fotech.geom.Segment(P, new fotech.geom.Point(xMin, yMin))))
            return null;

        // At this point we know that P intersects with the left edge.
        var PQ = new fotech.geom.Segment(P, Q);
        P.set(PQ.intersection(new fotech.geom.Segment(new fotech.geom.Point(xMin, yMin), new fotech.geom.Point(xMin, yMax))));

        // Determine the intersection for Q.
        if (Q.y >= yMax) {
            var xyMax = new fotech.geom.Point(xMax, yMax);
            if (Q.isLeftOf(new fotech.geom.Segment(P, xyMax)))
                Q.set(PQ.intersection(new fotech.geom.Segment(new fotech.geom.Point(xMin, yMax), xyMax)));
            else
                Q.set(PQ.intersection(new fotech.geom.Segment(new fotech.geom.Point(xMax, yMin), xyMax)));
        }
        else if (Q.y > yMin) {
            if (Q.x > xMax)
                Q.set(PQ.intersection(new fotech.geom.Segment(new fotech.geom.Point(xMax, yMin), new fotech.geom.Point(xMax, yMax))));
        }
        else {
            var xMaxyMin = new fotech.geom.Point(xMax, yMin);
            if (P.isLeftOf(new fotech.geom.Segment(P, xMaxyMin)))
                Q.set(PQ.intersection(new fotech.geom.Segment(xMaxyMin, new fotech.geom.Point(xMax, yMax))));
            else
                Q.set(PQ.intersection(new fotech.geom.Segment(new fotech.geom.Point(xMin, yMin), xMaxyMin)));
        }

        return PQ;
    },

// Region 3 - upper left
    __P_in_UL: function (P, Q, xMin, xMax, yMin, yMax) {
        // Perform the trivial rejections.
        if ((Q.x <= xMin)
            || (Q.y >= yMax)
            || Q.isLeftOf(new fotech.geom.Segment(P, new fotech.geom.Point(xMax, yMax)))
            || !Q.isLeftOf(new fotech.geom.Segment(P, new fotech.geom.Point(xMin, yMin))))
            return null;

        // P will be on either the left or top edge
        var PQ = new fotech.geom.Segment(P, Q);
        var xy = new fotech.geom.Point(xMin, yMax);
        if (Q.isLeftOf(new fotech.geom.Segment(P, xy)))
            P.set(PQ.intersection(new fotech.geom.Segment(xy, new fotech.geom.Point(xMax, yMax))));
        else
            P.set(PQ.intersection(new fotech.geom.Segment(new fotech.geom.Point(xMin, yMin), xy)));

        // Q will be on either the right or bottom edge or in the center
        xy = new fotech.geom.Point(xMax, yMin);
        if (Q.isLeftOf(new fotech.geom.Segment(P, xy))) {
            if (Q.x > xMax)
                Q.set(PQ.intersection(new fotech.geom.Segment(xy, new fotech.geom.Point(xMax, yMax))));
        }
        else {
            if (Q.y <= yMin)
                Q.set(PQ.intersection(new fotech.geom.Segment(new fotech.geom.Point(xMin, yMin), xy)));
        }

        return PQ;
    },

// Region 4 - lower center
    __P_in_LC: function (P, Q, xMin, xMax, yMin, yMax) {
        // Reject the trivial cases.
        if ((Q.y <= yMin) || !Q.isLeftOf(new fotech.geom.Segment(P, new fotech.geom.Point(xMax, yMin))))
            return null;

        // At this point we know that P should be on the bottom.
        var PQ = new fotech.geom.Segment(P, Q);
        P.set(PQ.intersection(new fotech.geom.Segment(new fotech.geom.Point(xMin, yMin), new fotech.geom.Point(xMax, yMin))));

        // Determine the position of Q.
        var xyMax = new fotech.geom.Point(xMax, yMax);
        if (Q.isLeftOf(new fotech.geom.Segment(P, xyMax))) {
            if (Q.y > yMax) {
                Q.set(PQ.intersection(new fotech.geom.Segment(new fotech.geom.Point(xMin, yMax), xyMax)));
            }
        }
        else {
            if (Q.x > xMax) {
                Q.set(PQ.intersection(new fotech.geom.Segment(new fotech.geom.Point(xMax, yMin), xyMax)));
            }
        }

        return PQ;
    },

// Region 5 - center center
    __P_in_CC: function (P, Q, xMin, xMax, yMin, yMax) {
        // P is already in position, find the position of Q.
        var PQ = new fotech.geom.Segment(P, Q);
        var xyMax = new fotech.geom.Point(xMax, yMax);
        if (Q.isLeftOf(new fotech.geom.Segment(P, xyMax)))
            Q.set(PQ.intersection(new fotech.geom.Segment(new fotech.geom.Point(xMin, yMax), xyMax)));
        else if (Q.isLeftOf(new fotech.geom.Segment(P, new fotech.geom.Point(xMax, yMin))))
            Q.set(PQ.intersection(new fotech.geom.Segment(new fotech.geom.Point(xMax, yMin), xyMax)));
        else
            Q.set(PQ.intersection(new fotech.geom.Segment(new fotech.geom.Point(xMin, yMin), new fotech.geom.Point(xMax, yMin))));

        return PQ;
    },

// Region 6 - upper center
    __P_in_UC: function (P, Q, xMin, xMax, yMin, yMax) {
        // Check for the trivial cases.
        if ((Q.y >= yMax) || Q.isLeftOf(new fotech.geom.Segment(P, new fotech.geom.Point(xMax, yMax))))
            return null;

        // At this point we know that P is on the top edge.
        var PQ = new fotech.geom.Segment(P, Q);
        P.set(PQ.intersection(new fotech.geom.Segment(new fotech.geom.Point(xMin, yMax), new fotech.geom.Point(xMax, yMax))));

        // Determine the position of Q.
        var xy = new fotech.geom.Point(xMax, yMin);
        if (Q.isLeftOf(new fotech.geom.Segment(P, xy))) {
            if (Q.x > xMax)
                Q.set(PQ.intersection(new fotech.geom.Segment(xy, new fotech.geom.Point(xMax, yMax))));
        }
        else {
            if (Q.y < yMin)
                Q.set(PQ.intersection(new fotech.geom.Segment(new fotech.geom.Point(xMin, yMin), xy)));
        }

        return PQ;
    }
};



