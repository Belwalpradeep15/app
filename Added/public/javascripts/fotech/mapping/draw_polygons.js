/*
 * FILENAME:    draw_polygons.js
 * AUTHOR:      Aaron Rustad <arustad@anassina.com>
 * CREATED ON:  
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
 * This file is Copyright © 2009 Fotech Solutions Ltd. All rights reserved.
 * heavily modified by Arunas Salkauskas Novemeber, 2016
 */

/**
 * Provides the ability to draw a multiline polygon on a map or diagram
 */

/** Fotech namespace. */
var fotech = (fotech ? fotech : {});

/** Fotech map namespace. */
fotech.map = (fotech.map ? fotech.map : {});


fotech.map.DrawPolygonControl = function(dialogOptions, polyLineColour, editor_dialog_creator) {
    this._drawingOn = false;
    this._markers = [];
    // the leaflet map class uses ._map
    this.map = null;
    this._polyShape = null;
    this._polyPoints = [];
    this._drawImageDiv = null; 
    this._deleteImageDiv= null;
    this._initialMapCentre=  null;
    this._initialMapZoom=  null;
    
    this._polyLineColour = polyLineColour;
    this._initialLoad = null;
    this._dialogOptions = dialogOptions;
    this._dialog_creator = editor_dialog_creator;
    this._editor_dialog = null;
};

fotech.map.DrawPolygonControl.prototype.setMap = function(map){
// since the map already arrives in the initialize method, I don't know why we need this
};

// called by the map implementation when we add the control
fotech.map.DrawPolygonControl.prototype.initialize = function(map) {
    this.map = map;
    this._initialMapCentre = this.map.getCenter();
    this._initialMapZoom = this.map.getZoom();

    var buttonDiv = document.createElement("div");
    var mapDiv = this.map.getContainer();

    this._drawImageDiv = this._initButton(buttonDiv);
  
    if (this._dialogOptions.deleteAction) {
        this._deleteImageDiv = this._initDeleteButton(buttonDiv);
    } 

    this._createDialog(this.dialog_creator);

    var me = this;
    this._drawImageDiv.observe('click', function(e) {
        me._drawButtonClicked(e, me, this);
        e.stop();
    });

    mapDiv.appendChild(buttonDiv);
    this.container = buttonDiv;
};

fotech.map.DrawPolygonControl.prototype._addMapListener = function() {
    this.map.addListener(this.map,'click', function(point) {
        if (point) {
            this._editor_dialog.changesExist = true;
            this._leftClick(point);
            this._editor_dialog.setMarkers(this._markers);
            this._editor_dialog.focusOnLastMarker();
            this._drawLineToMarker(this._markers[this._markers.length-1]);
        }
    }.bind(this));
};

fotech.map.DrawPolygonControl.prototype._removeMapListener = function() {
    this.map.clearListeners(this.map,'click')
};

fotech.map.DrawPolygonControl.prototype._drawButtonClicked = function(event, me, div) {
    if (me._drawingOn) {  // Turn drawing off
        me._editor_dialog.hide();
        me._markersDisabled();
        me._showSelectImage();
        me._removeMapListener();
    } else {                    // turn drawing on
        me._editor_dialog.show();
        me._markersEnabled();
        me._showDragImage();
        me._addMapListener();
    }
    me._drawingOn = !me._drawingOn;
    me._drawPoly();
};

fotech.map.DrawPolygonControl.prototype._markersDisabled = function() {
    for(var i = 0, len = this._markers.size(); i < len; i++) {
        this._markers[i].hide();
    }
    this._connector.unload();
    this._connector = null;
};

fotech.map.DrawPolygonControl.prototype._markersEnabled = function() {
    for(var i = 0, len = this._markers.size(); i < len; i++) {
        this._markers[i].show();
    }

    if (! this._connector)
        this._connector = new fotech.map.ConnectorLayer(this.map, this._editor_dialog);
};

fotech.map.DrawPolygonControl.prototype._showDragImage = function() { 
    this._drawImageDiv.innerHTML = "<img title='" + I18n.t('admin.fibre_lines.map_cal.drag_mode') + "' src='/images/hand-tool.gif'/>";
};

fotech.map.DrawPolygonControl.prototype._showSelectImage = function() { 
    this._drawImageDiv.innerHTML = "<img title='" + I18n.t('admin.fibre_lines.map_cal.edit_mode') + "' src='/images/draw_path.png'/>";
};


fotech.map.DrawPolygonControl.prototype._initButton = function(buttonContainerDiv) {
    var buttonDiv = document.createElement('div');
    buttonDiv.innerHTML = "<img title='" + I18n.t('admin.fibre_lines.map_cal.edit_mode') + "' src='/images/draw_path.png'/>";
    buttonContainerDiv.appendChild(buttonDiv);
    return buttonDiv;
};

fotech.map.DrawPolygonControl.prototype._initDeleteButton = function(buttonContainerDiv) {
    var buttonDiv = document.createElement('div');
    buttonDiv.innerHTML = "<img title='" + I18n.t('admin.fibre_lines.map_cal.delete_line') + "' src='" + this._dialogOptions.deleteImage + "'/>";

    buttonDiv.observe('click', function() {
        if (confirm(this._dialogOptions.deleteWarning)) {
            window.location = this._dialogOptions.deleteAction;
        }
    }.bind(this));
  
    buttonContainerDiv.appendChild(buttonDiv);
    return buttonDiv;
};


fotech.map.DrawPolygonControl.prototype._createDialog = function() {
    fibreDialog = this._dialog_creator(this._dialogOptions);

    fibreDialog.registerCallback('redraw', this.redrawCallback.bind(this));
    fibreDialog.registerCallback('removecoords', this.coordsRemovedCallback.bind(this));
    fibreDialog.registerCallback('removeallcoords', this.allCoordsRemovedCallback.bind(this));
    fibreDialog.registerCallback('addcoords', this.coordsAddedCallback.bind(this));
    fibreDialog.registerCallback('focusmarker', this._drawLineToMarker.bind(this));
    fibreDialog.callback.success = this._onSuccess.bind(this);

    fibreDialog.render($('body'));
    this._editor_dialog = fibreDialog;
};

fotech.map.DrawPolygonControl.prototype._drawLineToMarker = function(marker){
    if(!this.map){
        return; 
    } 
    this._connector._removeConnector();
    if (marker) { 
        this._connector.setToLatLon(marker.getPosition());
    }
};

fotech.map.DrawPolygonControl.prototype._onSuccess = function() {
    this._drawButtonClicked(null, this, null);
};

fotech.map.DrawPolygonControl.prototype.load = function(fibre_line_id, route, calibrations) {
    this._initialLoad = {fibre_line_id: fibre_line_id,
                        route: route, 
                        calibrations: calibrations };

    this._clearMarkers();
    this._clearPolyshape();

    for(var i = 0, len = route.size(); i < len; i++){
        this._leftClick(new LatLon(route[i].lat, route[i].long));
        this._markers[i]['calibration'] = calibrations[i];
    }

    this._zoomToRoute();
    this._refreshDialog();
};

fotech.map.DrawPolygonControl.prototype._reloadInitial = function() {
    if (this._initialLoad != null) {
        this.load(this._initialLoad.fibre_line_id,
                  this._initialLoad.route,
                  this._initialLoad.calibrations);
    } else {
        this.empty();
    }
};

fotech.map.DrawPolygonControl.prototype.empty = function() {
    this.load(null, [], []);
};

fotech.map.DrawPolygonControl.prototype._clearMarkers = function() {

    for (var i = 0, len = this._markers.size(); i < len; i++) {
        this.map.removeOverlay(this._markers[i]);
     }
     this._markers.length = 0;
}

fotech.map.DrawPolygonControl.prototype._clearPolyshape = function() {
    if (this._polyShape != null) {
        this.map.removeOverlay(this._polyShape);
        this._polyShape = null;
    }
};

fotech.map.DrawPolygonControl.prototype._refreshDialog = function() {
    this._editor_dialog.setMarkers(this._markers);
};

fotech.map.DrawPolygonControl.prototype._zoomToRoute = function() {
    if (this._polyShape == null) {
        this.map.setCenter(this._initialMapCentre);
        this.map.setZoom(this._initialMapZoom);
    } else {
        var bounds = this._polyShape.getBounds();
        this.map.zoomToBounds(bounds);
    }
};

fotech.map.DrawPolygonControl.prototype._createMarker = function(point) {
    var marker = this.map.newMarker(point, null,null,{draggable:true, bouncy:true, dragCrossMove:true});
  	this.map.addOverlay(marker);
    this.map.addListener(marker, "click", function() {
        this._editor_dialog.highlight(marker);
    }.bind(this));
  
    this.map.addListener(marker, "drag", function() {
        this._editor_dialog.changesExist = true;
        this._drawPoly();
        this._editor_dialog.setMarkers(this._markers);
        this._editor_dialog.highlight(marker);
    }.bind(this));
  
    return marker;
};

fotech.map.DrawPolygonControl.prototype._leftClick = function(point) {
    if (point) {
        var marker = this._createMarker(point);
        this._markers.push(marker);
        if (!this._drawingOn) {
            marker.hide();
        }
        this._drawPoly();
    }
};

fotech.map.DrawPolygonControl.prototype._drawPoly = function() {
    if (this._polyShape){
        this.map.removeOverlay(this._polyShape);
    }
    
    this._polyPoints.length = 0;
    
    for(var i = 0; i < this._markers.length; i++) {
        this._polyPoints.push(this._markers[i].getPosition());
    }

    this._polyShape = this.map.newLineOverlay(this._polyPoints, this._polyLineColour, 3, 0.8,{clickable: this._drawingOn});

    this.map.addListener(this._polyShape, 'click', this._insertControlPoint.bind(this));
    this.map.addOverlay(this._polyShape);
};

// Insert a new control point at the position clicked by the user. The point is
// added to the nearest existing line segment.
fotech.map.DrawPolygonControl.prototype._insertControlPoint = function(latLng) {
    if (this._drawingOn) {
        var pos = this._findInsertPosition(latLng);
        if (pos != null) {
            this._markers.splice(pos, 0, this._createMarker(latLng));
            this._drawPoly();
        }
    }
};

// Determine the correct position in the segments for inserting a new point.
fotech.map.DrawPolygonControl.prototype._findInsertPosition = function(latLng) {
    var bnds, a, b;
    var minDistance = Number.MAX_VALUE;
    var positionOfMin = null;
    for (var i = 0; i < this._markers.size() - 1; ++i) {
        a = this._markers[i].getPosition();
        b = this._markers[i+1].getPosition();

        var closest = latLng.closestPointOnSegment(a, b);
        var distance = latLng.distanceTo(closest);
        if (distance < minDistance) {
            minDistance = distance;
            positionOfMin = i;
        }
    }
    
    if (positionOfMin == null)
        return null;
    else
        return (positionOfMin + 1);
};

fotech.map.DrawPolygonControl.prototype._clearPoly = function() {
    this.hide();
    this._markers.length = 0;
};

/**
 * Hide the polygon, but don't clear out the 
 * markers or polygon
 */
fotech.map.DrawPolygonControl.prototype.hide = function() {
    this.map.removeOverlay(this._polyShape);

    this.map.removeOverlay(this._polyShape);
    for (i = 0; i < this._markers.length; i++) {
        this.map.removeOverlay(this._markers[i]);
    }
    if (this._connector)
        this._connector.setToLatLon();
}

fotech.map.DrawPolygonControl.prototype.show = function() {
    this._drawPoly();
    for (i = 0; i < this._markers.length; i++) {
        this.map.addOverlay(this._markers[i]);
    }
} ;

// By default, the control will appear in the top left corner of the
// map with 7 pixels of padding.
fotech.map.DrawPolygonControl.prototype._getDefaultPosition = function() {
    return {position: 'tl', x:100, y:7}; 
};

// Sets the proper CSS for the given button element.
fotech.map.DrawPolygonControl.prototype._setButtonStyle = function(button) {
    button.style.textDecoration = "underline";
    button.style.color = "#0000cc";
    button.style.backgroundColor = "white";
    button.style.font = "small Arial";
    button.style.border = "1px solid black";
    button.style.padding = "2px";
    button.style.marginBottom = "3px";
    button.style.textAlign = "center";
    button.style.width = "6em";
    button.style.cursor = "pointer";
};

fotech.map.DrawPolygonControl.prototype.redrawCallback = function() {
    this._drawPoly();
};

fotech.map.DrawPolygonControl.prototype.coordsRemovedCallback = function(marker) {
    this.map.removeOverlay(marker);
    this._drawPoly();
};

fotech.map.DrawPolygonControl.prototype.allCoordsRemovedCallback = function() {
    this._drawButtonClicked(null, this, null);
    this._reloadInitial();
};

fotech.map.DrawPolygonControl.prototype.coordsAddedCallback = function() {
    this._leftClick(this.map.getCenter());
    this._drawPoly();
    this._editor_dialog.setMarkers(this._markers);
};
