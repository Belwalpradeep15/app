/** Fotech namespace. */
var fotech = (fotech ? fotech : {});

/** Fotech map namespace. */
fotech.map = (fotech.map ? fotech.map : {});

fotech.map.AudioLayer = function (map) {
    fotech.map.layer.call(this, fotech.map.AudioLayer.layer_name, map);
    this.map = map;
    this.setBounds();
    this.marker_id = 1;
    this.onClickHandler = this.onClick.bind(this);
};

fotech.map.AudioLayer.prototype = Object.create(fotech.map.layer.prototype);
fotech.map.AudioLayer.prototype.constructor = fotech.map.AudioLayer;

fotech.map.AudioLayer.layer_name = "audio_layer";

fotech.map.AudioLayer.prototype.onClick = function (fibre_routes, fibre_route, lat_long) {
    if ($('audioEnabled')) {
        var closest_lat_long = fibre_route.pline.getClosestLatLng(lat_long);
        var position = fibre_route.getFibreDistanceAlongRoute(closest_lat_long);
        var audio_marker_editor = new fotech.map.Audio(this.map, "audio_marker", '/images/stream-sound-on-16x16.png', fibre_routes, fibre_route);
        audio_marker_editor._drawButtonClicked();
        audio_marker_editor.addMarker(this.marker_id++, closest_lat_long, null, '/images/audio_player.png', position);
    }
};
