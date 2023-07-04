/**
 * Created by arunas on 12/10/16.
 */



/** Fotech namespace. */
var fotech = (fotech ? fotech : {});

/** Fotech map namespace. */
fotech.map = (fotech.map ? fotech.map : {});

fotech.map.FibreRouteLayer = function (map, alertManager, track_style) {
    fotech.map.layer.call(this, fotech.map.FibreRouteLayer.layer_name, map);

    this._alertManager = alertManager;
    this.routes = {};
    this.track_style = track_style;
    this._highlightLayer = null;
    this.setBounds();  // sets no bounds

    this._breakLayer = null;
};

fotech.map.FibreRouteLayer.prototype = Object.create(fotech.map.layer.prototype);
fotech.map.FibreRouteLayer.prototype.constructor = fotech.map.FibreRouteLayer;

fotech.map.FibreRouteLayer.layer_name = "fibres_layer";

fotech.map.FibreRouteLayer.prototype.addFibreRoute = function (fibre_route) {
    this.routes[fibre_route.id] = fibre_route;
    this.updateBounds(fibre_route.getBounds().getSWNE());

    /* Fibres are considered "clicky" things, i.e. things we want to interact with,
     * give the polyline a clue that we want to use shadow lines (which are wider)
     * also, add a "context" marker, this can be used to disable other types of
     * objects (tracks/routes etc) when in a particular mode */
    this.track_style.shadow = true;
    this.track_style.context = "fibre";


    fibre_route.polyLineID = this.addPolyLine(fibre_route.pline.vertices, this.track_style,
        {
            "tt_provider": function (overlay, lat_long) {
                return this.getToolTipMessage(fibre_route);
            }.bind(this),
            "onClick": function (overlay, lat_long) {
                this.onClick(fibre_route, lat_long);
            }.bind(this)
        });
};

fotech.map.FibreRouteLayer.prototype.show = function (shouldShow, zIndex) {
    Object.getPrototypeOf(Object.getPrototypeOf(this)).show.bind(this)(shouldShow, zIndex);
    if (this._breakLayer)
        this._breakLayer.show(shouldShow, zIndex);
};

fotech.map.FibreRouteLayer.prototype.showBreaks = function (enable) {
    if (enable && !this._breakLayer) {
// TODO: We are ignoring the fibre break highlight in this version since it cannot handle
//   the 80/10 or 80km systems. We will need to re-enable and possibly rewrite this code
//   (and the broken_fibre_layer.js file) when we do story #15553.
//        this._breakLayer = new fotech.map.BrokenFibreLayer(this.map, this._alertManager, this);
//        this._breakLayer.show(enable);
    }
    else if (!enable && this._breakLayer) {
        this._breakLayer.unload();
        this._breakLayer = null;
    }
};

/**
 * getToolTipMessage
 * @param fibre_route - the fibre_route to describe
 * @returns {string}
 */
fotech.map.FibreRouteLayer.prototype.getToolTipMessage =
    function (fibre_route) {
        return "Fibre: " + fibre_route.name;
    };

/**
 * react to a mouse click
 * @param fibre_route - fibre_route that's been clicked
 * @param lat_long - the click location
 */
fotech.map.FibreRouteLayer.prototype.onClick =
    function (fibre_route, lat_long) {
        if ($('audioEnabled')) {
            this.map.getLayer(fotech.map.AudioLayer.layer_name).onClick(this.routes, fibre_route, lat_long);
        }
        else {
            for (var rt in this.routes) {
                if (this.routes.hasOwnProperty(rt)) {
                    var route = this.routes[rt];
                    if (route.id == fibre_route.id) {
                        this.setPolyLineStyle(route.polyLineID, {width: 8, colour: "#55ff55"} );
                    }
                    else {
                        this.resetPolyLineStyle(route.polyLineID);
                    }
                }
            }
        }
};

fotech.map.FibreRouteLayer.prototype.clearSelection = function() {
    this._clearHighlights();
};


fotech.map.FibreRouteLayer.prototype.highlightFibreSection = function(fibre_id, start, end, options) {
    if (this.routes.hasOwnProperty(fibre_id)) {
        var points = this.routes[fibre_id].getLatLngsForSubsection(start, end);
        if (points.length) {
            this._highlightFibreSections([points], options);
        }
    }
};

/**
 * Selects and highlights all portions of the fibres within the bounds
 * @param boundsList - a list of fotech.geom.gis.Bounds....I think
 * @param options - a fotech.map.trackStyle object, or similar describing how to show selected lines
 */
fotech.map.FibreRouteLayer.prototype.selectWithin = function(boundsList, options) {
    var polyLines = [];
    boundsList = [boundsList].flatten();
    var route = null;

    for (var b_idx in boundsList) {
        if (boundsList.hasOwnProperty(b_idx)) {
            var b = boundsList[b_idx];
            for (var id in this.routes) {
                if (this.routes.hasOwnProperty(id)) {
                    route = this.routes[id];
                    var intersection = b.intersection(route.pline.vertices);
                    if (intersection.length > 0) {
                        polyLines = polyLines.concat(intersection);
                    }
                }
            }
        }
    }

    this._highlightFibreSections(polyLines);

    return polyLines.length > 0;
};

fotech.map.FibreRouteLayer.prototype._highlightFibreSections = function(polyLines, options) {
    this._clearHighlights();

    options = options || new fotech.map.TrackStyle("#00ff00", 8, .5, false, 0, 0);

    if (polyLines.length) {
        this._highlightLayer = new fotech.map.layer("fibre_highlights", this.map);

        for (var i = 0; i < polyLines.length; i++) {
            this._highlightLayer.addPolyLine(polyLines[i], options
            );
        }
        if (this._highlightLayer.isRendered) // if already rendered, we need to do it again.
            this._highlightLayer.render();
    }
};

fotech.map.FibreRouteLayer.prototype._clearHighlights = function() {
    if (this._highlightLayer) {
        this._highlightLayer.unload();
        this._highlightLayer = null;
    }
};

fotech.map.FibreRouteLayer.prototype.getFibreRoute = function(id) {
   if (this.routes.hasOwnProperty(id)) return this.routes[id];
    return false;
};