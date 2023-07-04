/*
 * FILENAME:    fibre_region_layer.js
 * AUTHOR:      Matthew Stuart
 * CREATED ON:  2016-11-01
 *
 * DESCRIPTION:  Handles rendering the fibre region mapping layer
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

fotech.map.FibreRegionLayer = function (map) {
    fotech.map.layer.call(this, fotech.map.FibreRegionLayer.layer_name + Math.random(), map, "overlay");
    this._regions = [];
    this._route = null;
};

fotech.map.FibreRegionLayer.prototype = Object.create(fotech.map.layer.prototype);
fotech.map.FibreRegionLayer.prototype.constructor = fotech.map.FibreRegionLayer;

fotech.map.FibreRegionLayer.layer_name = "fibre_region";

fotech.map.FibreRegionLayer.prototype.setRoute = function(route) {
    this._route = route;
    return this;
};

fotech.map.FibreRegionLayer.prototype.addRegion = function(region) {
    region = Object.extend({
        id: null,
        name: '',
        lineId: null,
        positions: {},
        properties: {},
        vertices: {}
    }, region);

    region.vertices = this._route.getLatLngsForSubsection(region.positions.starting_position, region.positions.ending_position);
    if (!region.vertices.length) return;

    region.polyLineID = this.addPolyLine(
        region.vertices,
        {
            colour: region.properties.highlight_colour,
            weight: region.properties.highlight_width,
            opacity: region.properties.highlight_opacity / 100
        },
        {
            "tt_provider": function (overlay, lat_long) {
                return this.getToolTipMessage(region);
            }.bind(this)
        });

    this._regions.push(region);
};

fotech.map.FibreRegionLayer.prototype.show = function (shouldShow, zIndex) {
    Object.getPrototypeOf(Object.getPrototypeOf(this)).show.bind(this)(shouldShow, zIndex);
};

fotech.map.FibreRegionLayer.prototype.getControlLabel = function() {
    return I18n.t("monitor.map.controls.fibre_region", {fibre_name: this._route.getName()}) || this.getName();
};

fotech.map.FibreRegionLayer.prototype.render = function() {
    for (var i in this._toRender) {
        if (!this._toRender.hasOwnProperty(i)) continue;
        if (this._toRender[i] instanceof Function) {
            this._toRender[i]();
        }
    }
    this._toRender = [];

    this._isRendered = true;

    return this._polylines;
},

/**
 * getToolTipMessage
 * @param object - the fibre_route to describe
 * @returns {string}
 */
fotech.map.FibreRegionLayer.prototype.getToolTipMessage =
    function (region) {
        return I18n.t("monitor.map.fibre_region_tooltip", {name: region.name});
    };