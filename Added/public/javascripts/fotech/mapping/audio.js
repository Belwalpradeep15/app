/**
 *
 * Important methods are:
 *
 * subscribe(newMarkerCallback )
 *
 */


/** Fotech namespace. */
var fotech = (fotech ? fotech : {});

/** Fotech map namespace. */
fotech.map = (fotech.map ? fotech.map : {});

/**
 *
 * @param name - may be null
 * @constructor
 */
fotech.map.Audio = function(map, name, icon, fibre_routes, fibre) {
// more complete construction happens in initialize

    this._drawingOn = false;
    this.map = map;
    this._icon = icon;
    this._name = name;
    this.fibre_routes = fibre_routes;
    this._newMarkerCallback = null;
    this._markerMovedCallback = null;
    this._markerClickedCallback = null;
    this.fibre_route = fibre;
    this._drawImageDiv = null;
    this._onMarkerClickHandler = this._onMarkerClick.bind(this);
    this.map.addControl(this);
};

fotech.map.Audio.prototype = Object.create(fotech.map.layer.prototype);

/**
 * subscribe
 * @param newAudioMarkerCallback (string id , LatLon location)
 *
 * callback will recieve an ID and a LatLon object when the appropriate events happen.
 */
fotech.map.Audio.prototype.subscribe = function (newAudioMarkerCallback) {
    this._newMarkerCallback = newAudioMarkerCallback;
};

fotech.map.Audio.prototype.setMap = function(map) {

};

fotech.map.Audio.prototype.unload = function() {
    childWindows.forEach(function (key, window) { window.close(); });
    Object.getPrototypeOf(Object.getPrototypeOf(this)).unload.bind(this)();
};

fotech.map.Audio.prototype.removeAllMarkers = function(markers) {
    for(var id in markers){
        if (markers.hasOwnProperty(id)) {
            var marker = markers[id];
            var audio_player_id = id;
            var audio_window = childWindows.get(audio_player_id);

            try {
                vueApp.$store.dispatch( 'panels/remove', vueApp.$store.getters[ 'panels/id']( 'RemoteAudio-' + id ) );
            } catch( e ) {
                console.log( "unable to remove close window and remove marker" );
            }
//            if (audio_window !== null) {
//                audio_window.postMessage( { 'audio_location_change': { 'channel_id' : parseInt(marker.channel_id), 'shutdown': true, 'child_identifier' : audio_player_id } }, '*');
//            }
        }
    }
};

/**
 *
 * @param id
 * @param location - a LatLon object
 * @param name
 * @param icon
 */
fotech.map.Audio.prototype.addMarker = function(id, location, name, icon, position) {

    this.updateMarker(id, location, name, icon || this._icon);
    this.setMarkerDraggable(id, this._drawingOn);

    var marker = this._markers[id];
    var start_point = position;
    var end_point = position + 50;

    this.newAudio(id, this.fibre_route.helios_channel_id, this.fibre_route.host_name, start_point, end_point );
    
    marker.fibre_id = this.fibre_route.id;
    marker.start_point = start_point;
    marker.end_point = end_point;
    marker.channel_id = this.fibre_route.helios_channel_id;
    this.updateBounds(location);
    Event.observe(window, 'message:audio_loaded', function(ev) {
        this.postMarkerDetails(ev);
    }.bind(this));
    Event.observe(window, 'message:audio_unloaded', function(ev) {
        this.removeMarker(ev);
    }.bind(this));
    Event.observe(window, 'fotech:map.marker.dragend', function(ev) {
        this._onMarkerDragged(ev);
    }.bind(this));
};

/**
 *
 * @param id
 * @param location - a LatLon object
 * @param name
 * @param icon
 */
fotech.map.Audio.prototype.updateMarker = function(id, location, name, icon) {
    this.addOrUpdateMarker(id, name, location, icon || this._icon,
        {}, { "onClick": this._onMarkerClickHandler });
};

fotech.map.Audio.prototype.removeMarker = function(ev) {
    var id = ev.memo;
    var marker = this._markers[id];
    if (typeof marker != "undefined" && marker) {
        if (this.map.removeOverlay != undefined)
            this.map.removeOverlay(marker);
        delete this._markers[id];
    }
};


// called by the map implementation when we add the control
fotech.map.Audio.prototype.initialize = function(map) {
    fotech.map.layer.call(this, fotech.map.layer_name, map);
    if ($("select_audio")) {
        var buttonDiv = $("select_audio");
        this._drawImageDiv = buttonDiv;
        var mapDiv = this.map.getContainer();
    }
    else {
        var buttonDiv = document.createElement("div");
        buttonDiv.id = "select_audio";
        var mapDiv = this.map.getContainer();
        this._drawImageDiv = this._initButton(buttonDiv);
    }

    this._drawImageDiv.observe('click', function(e) {
        this._drawButtonClicked();
        e.stop();
    }.bind(this));
    mapDiv.appendChild(buttonDiv);
    this.container = buttonDiv;
};

fotech.map.Audio.prototype._onMarkerClick = function(marker, lat_long)
{
    var id = this._getIDForMarker(marker);
    var aWindow = childWindows.get(id);
    aWindow.focus();
    return aWindow;
};

fotech.map.Audio.prototype._onMarkerDragged = function(ev) {
    var marker = ev.memo;
    var lat_long = marker.getPosition();
    var id = this._getIDForMarker(marker);
    if( id && this.fibre_route && marker.fibre_id == this.fibre_route.id) {
        var point = this.map.getPixelFromPosition(lat_long);
        var latLngBnds = new fotech.geom.gis.Bounds([
        this.map.getPositionFromPixel({x: point.x - 5, y: point.y - 5}),
        this.map.getPositionFromPixel({x: point.x + 5, y: point.y + 5})]);
        var valid_position = this.validateSelectedBounds(latLngBnds);
        if(!valid_position) {
            var lat_long = this.fibre_route.pline.getClosestLatLng(lat_long)
        }
        marker.setPosition(lat_long);
        var position = this.fibre_route.getFibreDistanceAlongRoute(lat_long);
        var channel_id = this.fibre_route.helios_channel_id;
        marker.start_point = position;
        marker.end_point = position + 50;
        this.postDataToAudioPopup(marker, id);
    }
};

fotech.map.Audio.prototype.postMarkerDetails = function(ev) {
    var id = ev.memo;
    var marker = this._markers[id];
    this.postDataToAudioPopup(marker, id);
};

fotech.map.Audio.prototype.postDataToAudioPopup = function(marker, child_identifier) {
    if(marker) {
        var start_m = marker.start_point;
        var end_m = marker.end_point;
        var channel_id = marker.channel_id;

        try {
            /* We need to ascertain which window (panel) it is we are controlling */
            var panelId = vueApp.$store.getters[ 'panels/id']( "RemoteAudio_" + child_identifier );
            vueApp.$store.dispatch( 'panels/preferences', {
                name: panelId,
                values: {
                    start_m: start_m,
                    end_m: end_m,
                    channel_id: channel_id,
                    play: true,
                    child_identifier: child_identifier,
                }
            });

        } catch( e ){
            console.log( "Unable to dispatch audio change event" );
        }
    }
};

// returns true or false
// To check Audio icon drop position on fibre line
fotech.map.Audio.prototype.validateSelectedBounds = function(boundsList) {
    var polyLines = [];
    var fibre_route = this.fibre_route;
    boundsList = [boundsList].flatten();
    for (var b_idx in boundsList) {
        if (boundsList.hasOwnProperty(b_idx)) {
            var b = boundsList[b_idx];
            for (var id in fibre_route) {
                if (fibre_route.hasOwnProperty(id)) {
                    var intersection = b.intersection(fibre_route.pline.vertices);
                    if (intersection.length > 0) {
                        polyLines = polyLines.concat(intersection);
                    }
                }
            }
        }
    }
    return polyLines.length > 0;
};

fotech.map.Audio.prototype._getIDForMarker = function(marker) {
    for (var id in this._markers) {
        if (this._markers.hasOwnProperty(id)) {
            if (marker == this._markers[id]) {
                return id;
            }
        }
    }
    return null;
};


fotech.map.Audio.prototype._removeMapListener = function() {
    this.map.clearListeners(this.map,'click')
};

fotech.map.Audio.prototype._drawButtonClicked = function() {
    if (this._drawingOn) {  // Turn drawing off
        this._editable(false);
        this._showDeselectAudioImage();
        this.removeAllMarkers(this._markers);
        this._removeMapListener();
    }
    else {                    // turn drawing on
        this._editable(true);
        this._showSelectAudioImage();
    }
    this._drawingOn = !this._drawingOn;
};

fotech.map.Audio.prototype._editable = function(enable) {
    this.setMarkersDraggable(enable);
};

fotech.map.Audio.prototype._showSelectAudioImage = function() {
    this._drawImageDiv.firstDescendant().replace( this.map.menuButton( 'volume-up', '', { "id": 'audioEnabled', "title": 'Disable audio mode', "class": "enabled" } ));
    document.body.classList.add('audiomode');
};

fotech.map.Audio.prototype._showDeselectAudioImage = function() {
    this._drawImageDiv.firstDescendant().replace( this.map.menuButton( 'volume-up', '', { "id": 'audioDisabled', "title": 'Enable audio mode' } ));
    document.body.classList.remove('audiomode');
};


fotech.map.Audio.prototype._initButton = function(buttonContainerDiv) {
    var buttonDiv = document.createElement('div');

    buttonDiv.appendChild( this.map.menuButton( 'volume-up', '', { "id": 'audioDisabled', "title": 'Enable audio mode' } ));
    buttonContainerDiv.appendChild(buttonDiv);
    return buttonDiv;
};

// By default, the control will appear in the top left corner of the
// map with 7 pixels of padding.
fotech.map.Audio.prototype._getDefaultPosition = function() {
    return {position: 'tl', x:100, y:7};
};

// Sets the proper CSS for the given button element.
fotech.map.Audio.prototype._setButtonStyle = function(button) {
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


/** Bring up the dialog for adding a new audio.*/
fotech.map.Audio.prototype.newAudio = function( id, channel_id, helios_host_name, start_m, end_m ) {
    var title = id;
    if (helios_host_name != 'null') {
        try {
            vueApp.$store.dispatch(
                            'panels/add',
                            {
                                name: "RemoteAudio_" + id,
                                type: "RemoteAudioPanel",
                                options: {
                                    hostname: helios_host_name,
                                    child_identifier: id,
                                    start_m: start_m,
                                    end_m: end_m,
                                    channel_id: channel_id
                                },
                                show: true,
                            } )
        } catch (e ){
            console.log( "Unable to launch Audio API" );
        }
    }
    else
    {
        alert(I18n.t('admin.helios_units.helios_not_available'));
    }
};


/**
 * handle messages from the child audio player windows
 *
 */
window.addEventListener('message', function (e) {
	try {
		var message = JSON.parse(e.data);
		var id = parseInt(message.data);
		switch(message.command)
		{
			case 'audio_loaded':
				Event.fire(window, 'message:audio_loaded',id);
				break;
			case 'audio_unloaded':
				Event.fire(window, 'message:audio_unloaded',id);
				break;
		}
	} catch( e ) {
	}
});
