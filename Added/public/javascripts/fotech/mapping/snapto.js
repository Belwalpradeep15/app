/*
#  snapto.js
#  panoptes
#
#  Created by Steven W. Klassen on 2013-02-24.
#  Copyright (c) 2013 Fotech Solutions (Canada) Ltd. All rights reserved.

 Used to provide a highlighted means of snapping positions to a route.
*/

//////////////////////
//  WARNING:  Since this digs into the mapping object, it actually undermines the ownership that
//            the new Layer classes have over their markers.  We can't safely use this approach any more!!!!
//            if you decide that you need it...this has to be fixed!  In the meantime, I've commented it all out.
//    TODO:   figure out how/whether this should work with new map layers.  It appears not to be used...

// Setup the namespaces.
// var fotech = (fotech ? fotech : {});
// fotech.map = (fotech.map ? fotech.map : {});
//
//
// /**
//  * Object to snap positions to a route.
//  */
// fotech.map.SnapTo = function(map) {
//     this._map = map;
//     this._mapImpl = map.getMapImplementation();
//     this._route = null;
//     this._highlight = null;
//     this._marker = null;
// }
//
// // Reset the route.
// fotech.map.SnapTo.prototype.resetRoute = function(route) {
//     this._route = route;
//
//     if (this._highlight)
//         this._mapImpl.removeOverlay(this._highlight);
//     this._highlight = this._mapImpl.newLineOverlay(route.vertices, '#FF0000', 1, 0);
//     this._mapImpl.addOverlay(this._highlight);
//
//     if (this._marker)
//         this.resetMarkerPosition(this._marker.getPosition());
// }
//
// // Get the current position of the marker, if any.
// fotech.map.SnapTo.prototype.getMarkerPosition = function(pos) {
//     if (this._marker)
//         return this._marker.getPosition();
//     else
//         return null;
// }
//
// // Reset the current marker position.
// fotech.map.SnapTo.prototype.resetMarkerPosition = function(pos) {
//     if (this._marker)
//         this._mapImpl.removeOverlay(this._marker);
//     this._marker = this._mapImpl.newMarker(this._route.getClosestPoint(pos), null, null);
//     this._mapImpl.addOverlay(this._marker);
// }

