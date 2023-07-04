/**
 * Created by arunas on 16/11/16.
 *
 * Handles the graphical editing of markers
 *
 * markers have an ID, a location, a name, and an icon path
 *
 * Note that this control, by itself doesn't actually edit anything in a database - instead,
 * it sends notifications about things having been changed to what ever is listening.  Note that only
 * one subscriber at a time is permitted.
 *
 * Important methods are:
 *
 * subscribe(newMarkerCallback, markerMovedCallback, markerClickedCallback )
 * setMarkers(markers)
 *
 */


/** Fotech namespace. */
var fotech = (fotech ? fotech : {});

/** Fotech map namespace. */
fotech.map = (fotech.map ? fotech.map : {});

/**
 *
 * @param name - may be null
 * @param icon - may be null, used as a default
 * @constructor
 */
fotech.map.MarkerEditor = function(map, name, icon) {
// more complete connstruction happens in initialize
    
    this._drawingOn = false;
    this.map = map;
    this._icon = icon;
    this._name = name;

    this._newMarkerCallback = null;
    this._markerMovedCallback = null;
    this._markerClickedCallback = null;
    
    this._drawImageDiv = null;

    this._onClickHandler = this._onClick.bind(this);
    this._onMarkerClickHandler = this._onMarkerClick.bind(this);
    this._onMarkerDraggedHandler = this._onMarkerDragged.bind(this);

    Event.observe(window, "fotech:map.marker.dragged", this._onMarkerDraggedHandler);

    this.map.addControl(this);
};
fotech.map.MarkerEditor.prototype = Object.create(fotech.map.layer.prototype);

fotech.map.MarkerEditor.getLayerName = function(subname) {
    return "marker_editor_layer_" + subname;
};

/**
 * subscribe
 * @param newMarkerCallback (string id , LatLon location)
 * @param markerMovedCallback
 * @param markerClickedCallback
 * @param editModeEnabledCallback (bool enabled)
 *
 * each callback will recieve an ID and a LatLon object when the appropriate events happen.
 */
fotech.map.MarkerEditor.prototype.subscribe = function (newMarkerCallback, markerMovedCallback,
                                                        markerClickedCallback, editModeEnabledCallback ) {
    this._newMarkerCallback = newMarkerCallback;
    this._markerMovedCallback = markerMovedCallback;
    this._markerClickedCallback = markerClickedCallback;
    this._editModeEnabledCallback = editModeEnabledCallback;
};

/**
 * sets a dialog that will be the destination for a connector line from the currently selected marker
 * can be a popup or a dialog
 * @param dialog
 */
fotech.map.MarkerEditor.prototype.setConnectorLineDialogDest = function (dialog) {
    this._connectorTarget = dialog;
    if (this._connector) {
        this._connector.setFromDialog(dialog);
    }
};

/**
 * setMarkers
 * @param markers - an object of  { id : {lat: y , long: x, icon: path, name:   description:   } ..... }
 *
 * note that lat and long do not actually need to be lattitude and longitude on a spheroid, they can just
 * be y and x coordinates, in particular they need to match the coordinate system of the host map object
 * if the icon path is not there then the default marker icon will be used
 */
fotech.map.MarkerEditor.prototype.setMarkers = function(markers) {

    this.removeAllMarkers();

    for(var id in markers){
        if (markers.hasOwnProperty(id)) {
            var marker = markers[id];
            this.updateMarker(id, new LatLon(marker.lat, marker.long), marker.name, marker.icon || this._icon);
        }
    }

    this.map.zoomToBounds();
};

fotech.map.MarkerEditor.prototype.removeAllMarkers = function() {
    Object.getPrototypeOf(Object.getPrototypeOf(this)).removeAllMarkers.bind(this)();

    if (this._connector) {
        this._connector.setToLatLon();
    }
};

/**
 * When in editing mode, this sets the connector line to point to the selected marker
 * otherwise doesn't actually do anything.
 * @param id
 */
fotech.map.MarkerEditor.prototype.selectMarker = function(id) {

    if (this._connector) {
        this._connector.setToLatLon(this._markers[id].getPosition());
    }
}

/**
 *
 * @param id
 * @param location - a LatLon object
 * @param name
 * @param icon
 */
fotech.map.MarkerEditor.prototype.addMarker = function(id, location, name, icon) {
    this.updateMarker(id, location, name, icon || this._icon);
    this._drawLineToMarker(this.getMarker(id));
    if (this._newMarkerCallback)
        this._newMarkerCallback(id, location, this.removeMarker);

    this.setMarkerDraggable(id, this._drawingOn);
};

/**
 *
 * @param id
 * @param location - a LatLon object
 * @param name
 * @param icon
 */
fotech.map.MarkerEditor.prototype.updateMarker = function(id, location, name, icon) {
    this.addOrUpdateMarker(id, name, location, icon || this._icon,
        {}, { "onClick": this._onMarkerClickHandler });
};

fotech.map.MarkerEditor.prototype.removeMarker = function(id) {
    Object.getPrototypeOf(Object.getPrototypeOf(this)).removeMarker(id).bind(this)();

    if (this._connector) {
        this._connector.setToLatLon();
    }
};

//////////////////////////////////////////////////////////////////
//
//  Less public methods


fotech.map.MarkerEditor.prototype.unload = function(){
    Object.getPrototypeOf(Object.getPrototypeOf(this)).unload.bind(this)();
    if (this._connector)
        this._connector.unload();
    this._connector = null;

    this._removeMapListener();
};

fotech.map.MarkerEditor.prototype.setMap = function(map){
// since the map already arrives in the initialize method, I don't know why we need this
};

// called by the map implementation when we add the control
fotech.map.MarkerEditor.prototype.initialize = function(map) {
    fotech.map.layer.call(this, fotech.map.layer_name, map);

    var buttonDiv = document.createElement("div");
    var mapDiv = this.map.getContainer();

    this._drawImageDiv = this._initButton(buttonDiv);

    this._drawImageDiv.observe('click', function(e) {
        this._drawButtonClicked();
        e.stop();
    }.bind(this));

    mapDiv.appendChild(buttonDiv);
    this.container = buttonDiv;
};

fotech.map.MarkerEditor.prototype._addMapListener = function() {
    this.map.addListener(this.map,'click', this._onClickHandler);
};

fotech.map.MarkerEditor.prototype._onClick = function(point) {
    if (this._drawingOn && point) {
        var newID = fotech.map.MarkerEditor.__getTempID();

        this.addMarker(newID, point);
    }
};

// static method
fotech.map.MarkerEditor.__getTempID = (function () {
    var counter = 0;
    return function () {return "new_marker_" + (++counter) ;};
})();

fotech.map.MarkerEditor.prototype._onMarkerClick = function(marker, point) {

    var id = this._getIDForMarker(marker);
    if (id) {
        this._drawLineToMarker(marker);
        if (this._markerClickedCallback)
            this._markerClickedCallback(id, marker.getPosition());
    }
};

fotech.map.MarkerEditor.prototype._onMarkerDragged = function(ev) {
    var marker = ev.memo;
    var point = marker.getPosition();

    var id = this._getIDForMarker(marker);
    document.fire("marker:moved", point);
    if (id) {
        this._drawLineToMarker(marker);
        if (this._markerMovedCallback)
            this._markerMovedCallback(id, point);
    }
};

fotech.map.MarkerEditor.prototype._getIDForMarker = function(marker) {
    for (var id in this._markers) {
        if (this._markers.hasOwnProperty(id)){
            if (marker == this._markers[id]) {
                return id;
            }
        }
    }
    return null;
};


fotech.map.MarkerEditor.prototype._removeMapListener = function() {
    this.map.clearListeners(this.map,'click')
};

fotech.map.MarkerEditor.prototype._drawButtonClicked = function() {
    if (this._drawingOn) {  // Turn drawing off
        this._editable(false);
        this._showSelectImage();
        this._removeMapListener();
    } else {                    // turn drawing on
        this._editable(true);
        this._showDragImage();
        this._addMapListener();
    }
    this._drawingOn = !this._drawingOn;

    if (this._editModeEnabledCallback)
        this._editModeEnabledCallback(this._drawingOn);
};

fotech.map.MarkerEditor.prototype._editable = function(enable) {
    this.setMarkersDraggable(enable);
    if (! enable) {
        if (this._connector) {
            this._connector.unload();
            this._connector = null;
        }
    }
    else {
        if (! this._connector)
            this._connector = new fotech.map.ConnectorLayer(this.map, this._connectorTarget);
    }
};

fotech.map.MarkerEditor.prototype._showDragImage = function() {
    this._drawImageDiv.innerHTML = "<img title='" + I18n.t('admin.fibre_lines.map_cal.drag_mode') + "' src='/images/hand-tool.gif'/>";
};

fotech.map.MarkerEditor.prototype._showSelectImage = function() {
    this._drawImageDiv.innerHTML = "<img title='" + I18n.t('admin.fibre_lines.map_cal.edit_mode') + "' src='/images/draw_path.png'/>";
};


fotech.map.MarkerEditor.prototype._initButton = function(buttonContainerDiv) {
    var buttonDiv = document.createElement('div');
    buttonDiv.innerHTML = "<img title='" + I18n.t('admin.fibre_lines.map_cal.edit_mode') + "' src='/images/draw_path.png'/>";
    buttonContainerDiv.appendChild(buttonDiv);
    return buttonDiv;
};

fotech.map.MarkerEditor.prototype._drawLineToMarker = function(marker){
    if (marker &&  this._connector) {
        this._connector.setToLatLon(marker.getPosition());
    }
};



// By default, the control will appear in the top left corner of the
// map with 7 pixels of padding.
fotech.map.MarkerEditor.prototype._getDefaultPosition = function() {
    return {position: 'tl', x:100, y:7};
};

// Sets the proper CSS for the given button element.
fotech.map.MarkerEditor.prototype._setButtonStyle = function(button) {
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

