/*
#  map_null_impl.js
#  panoptes
#
#  Created by Steven W. Klassen on 2013-02-24.
#  Copyright (c) 2013 Fotech Solutions (Canada) Ltd. All rights reserved.

 Null implementation of our Map API.
*/


// Setup the namespaces.
var fotech = (fotech ? fotech : {});
fotech.map = (fotech.map ? fotech.map : {});
fotech.map.impl = (fotech.map.impl ? fotech.map.impl : {});


/**
 * Construct a Null Map implementation.
 */
fotech.map.impl.Null = function(provider) {
    this._provider = provider;
    console.log("Error: Unsupported map provider '" + this._provider + "'.");
}
fotech.map.impl.Null.prototype._throwException = function() {
    throw "Error: Unsupported map provider '" + this._provider + "'.";
}

fotech.map.impl.Null.prototype.isCompatible = fotech.map.impl.Null.prototype._throwException;
fotech.map.impl.Null.prototype.getCenter = fotech.map.impl.Null.prototype._throwException;
fotech.map.impl.Null.prototype.closeInfoWindow = fotech.map.impl.Null.prototype._throwException;
fotech.map.impl.Null.prototype.newMarker = fotech.map.impl.Null.prototype._throwException;
fotech.map.impl.Null.prototype.newLineOverlay = fotech.map.impl.Null.prototype._throwException;
fotech.map.impl.Null.prototype.addOverlay = fotech.map.impl.Null.prototype._throwException;
fotech.map.impl.Null.prototype.removeOverlay = fotech.map.impl.Null.prototype._throwException;

