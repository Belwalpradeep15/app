/**
 * Created by arunas on 13/10/16.
 */


/** Fotech namespace. */
var fotech = (fotech ? fotech : {});

/** Fotech map namespace. */
fotech.map = (fotech.map ? fotech.map : {});

///////////////////////////////////////////////////////////
//
//  fotech.map.AlertsLayer
//
//  - handles drawing and manipulating Alert/Alarm markers on a map
//  TODO:  it would be nice to sort out the name space collisions.  Event, vs event etc
//         it's hard to tell a js event from a helios event from a prototype event.
//         can't use 'alert' as a variable name without running into the js alert function...

//  TODO:  refactoring - this is largely equivalent to the events_layer, but I made it separate
//         for clarity, and out of not being quite sure how different they might end up

fotech.map.AlertsLayer = function (map, threatLevelsForIcons, alertManager, fibreRoutes) {
    fotech.map.layer.call(this, fotech.map.AlertsLayer.layer_name, map);

    this._alerts = {};

    /* Override the configured list with one derived from the vue store */
    //this._threatLevelsForIcons = threatLevelsForIcons || [];
    Object.defineProperty( this, '_threatLevelsForIcons', {
        get: function(){
            try {
                return vueApp.$store.getters[ 'alerts/levels' ]( 'icons' );
            } catch ( e ) {
                return threatLevelsForIcons;
            }
        }
    })

    this.setBounds();  // sets no bounds
    this.fibreRoutes = fibreRoutes;

    this.onGetTTHandler = this.getToolTipMessage.bind(this);
    this.onClickHandler = this.onClick.bind(this);
    this._setAlertHandlers(alertManager);
    this._updateAlerts(alertManager.asArray());
};

fotech.map.AlertsLayer.prototype = Object.create(fotech.map.layer.prototype);
fotech.map.AlertsLayer.prototype.constructor = fotech.map.AlertsLayer;

fotech.map.AlertsLayer.layer_name = "alerts_layer";

fotech.map.AlertsLayer.prototype.mapAlertId = function(id) {
    return "alert:" + id;
}

fotech.map.AlertsLayer.prototype.unload = function () {
    // TODO:  well.  This just looks awkward - is there a better way to call the parent class?
    Object.getPrototypeOf(Object.getPrototypeOf(this)).unload.bind(this)();
    this._unsetAlertHandlers();
};

fotech.map.AlertsLayer.prototype.addAlert = function (alert) {
    var coords = this.resolveCoordinates(alert, this.map.map_type);
    if (coords) {
        alert._position = this.resolveCoordinates(alert, this.map.map_type)

        this.addOrUpdateMarker(this.mapAlertId(alert.id), "",
            alert._position, alert.details.icon,
            {
                className: 'alert', throb: true, level: alert.threat_level
            },
            {
                "tt_provider": this.onGetTTHandler,
                "onClick": this.onClickHandler
            }, {"alert": alert});

        this._alerts[alert.id] = alert;
        this.updateBounds(alert._position);
    }
};

/* The alert position may be a string along the lines of "convert: XXXX m" rather than a
 * distance.  This is a clue to the UI that *this* distance should be converted on display
 * into the user's native format (presumably feet, inches, furlongs, leages etc) and
 * not rendered as meters.
 * 
 * The distance is however guaranteed to be in meters, so we should introduce a mechansim
 * to convert back from this format into a simple Floating point number instead */

fotech.map.AlertsLayer.prototype.getAlertPosition = function(location) {
    return parseFloat( String(location || "" ).match( /[\d\.]+/g ) );
}

/**
 * getToolTipMessage
 * @param name - the name of the alarm to describe
 * @returns {string}
 */
fotech.map.AlertsLayer.prototype.getToolTipMessage =
    function (overlay) {
        var key = 'alert.name.' + overlay.extra.alert.name;
        var name;
        
        if ( I18n.lookup( key )){
            name = I18n.t(key);
        } else {
            /* No translated name for this alert type, we should try to look it up using some alternative
               means, check if we know anything about these events via the REST API */
            try {
                name = vueApp.$store.state.configuration.event_types[ ( overlay.extra.alert.name || "" ).replace( '_alert', '' ) ].description;
            } catch( e ){
                name = overlay.extra.alert.name;
            }
        }

        var translated_name = I18n.t('admin.alerts.show.title', { name : name });
        return (translated_name);
    };


fotech.map.AlertsLayer.prototype.onClick = function(overlay, lat_long) {
    // TODO:  this a little too loosely coupled...I'd prefer if the
    //        alertslist or this layer knew about each other.
    var alert = overlay.extra.alert;  // not happy about this...
    Event.fire(document, 'fotechmap:alertclicked', alert);
};
/**
 * Remove an event from the layer.
 */
fotech.map.AlertsLayer.prototype.removeAlert = function (anAlertID) {
    if (typeof anAlertID != "undefined" && anAlertID) {
        this.removeMarker(this.mapAlertId(anAlertID));
        this._alerts[anAlertID] = null;
        delete this._alerts[anAlertID];
    }
};

fotech.map.AlertsLayer.prototype.removeAlerts = function (alertIds) {
    for (var i = 0; i < alertIds.length; i++) {
        this.removeAlert(alertIds[i]);
    }
};
fotech.map.AlertsLayer.prototype._removeAlertsHandler = function (ev) {
    var ids = ev.memo.ids;
    ids = [ids].flatten();
    this.removeAlerts(ids);
};

fotech.map.AlertsLayer.prototype._updateAlert = function (alert) {
    if (alert) {
        if (this._threatLevelsForIcons.include(alert.threat_level) && alert.status != "resolved") {
            this.addAlert(alert);
        }
        else {
            this.removeAlert(alert.id);
        }
    }
};

fotech.map.AlertsLayer.prototype.updateAlerts = function (alertIds) {
    this._batch = this._batch ? this._batch : []; /* Batch messages which can then be cleared within throttling */
    this._batch = this._batch.concat( alertIds );
}

fotech.map.AlertsLayer.prototype._updateAlerts = function (alerts) {
    for (var i = 0; i < alerts.length; i++) {
        this._updateAlert(alerts[i]);
    }
};

fotech.map.AlertsLayer.prototype._updateAlertsHandler = function (ev) {
    var ids = ev.memo.ids;
    ids = [ids].flatten();
    this.updateAlerts(ids);

    this._throttledUpdate = this._throttledUpdate ? this._throttledUpdate : fotech.throttle( function(){
        var todo = this._batch.splice(0,10);

        for (var i = 0; i < todo.length; i++) {
            var alert = this._alertManager.get(todo[i]);
            this._updateAlert(alert);
        }

        if ( this._batch.length > 0 ){
            this._throttledUpdate();
        }
    }.bind( this ), 250 );

    this._throttledUpdate();
};

fotech.map.AlertsLayer.prototype._setAlertHandlers = function(alertManager) {
    this._alertManager = alertManager;
    if (alertManager) {
        /* Rebind the localised functions to ensure that they get called in the correct
           context (i.e. with the correct this) */

        this._updateAlertsHandler = this._updateAlertsHandler.bind(this);
        this._removeAlertsHandler = this._removeAlertsHandler.bind(this);

        alertManager.observe('alert:add',    this._updateAlertsHandler);
        alertManager.observe('alert:update', this._updateAlertsHandler);
        alertManager.observe('alert:remove', this._removeAlertsHandler);
        alertManager.observe('alert:removeMultiple', this._removeAlertsHandler);
    }
};

fotech.map.AlertsLayer.prototype._unsetAlertHandlers = function(){
    if (this._alertManager) {
        /* When stopping observing, pass the observer function we want to remove
           otherwise this will prevent *all* other events from firing by clearing
           the observers entirely */
        this._alertManager.stopObserving('alert:add',    this._updateAlertsHandler);
        this._alertManager.stopObserving('alert:update', this._updateAlertsHandler);
        this._alertManager.stopObserving('alert:remove', this._removeAlertsHandler);
        this._alertManager.stopObserving('alert:removeMultiple', this._removeAlertsHandler);
    }
};

fotech.map.AlertsLayer.prototype.resolveCoordinates = function(incident, map_type){
	var result = null;
	if (map_type == 'engineering') {
		if (incident) {
			var fibre_line_id = (incident.details.fibre_line_id == null) ? incident.fibre_line_id : incident.details.fibre_line_id;
			var route = this.fibreRoutes[fibre_line_id];
			if (route) {
				var position = ( incident.details.position == null ) ? incident.position : incident.details.position;
				result = route.latLngFromFibrePosition(parseFloat(this.getAlertPosition(position)));
				if (!result) {
					result = route.lastFibreVertex();
					setStatusMessage(I18n.t('common.status_message.out_of_calibrated_range',
											{
											name: incident.name, /** name: incident.getType().desc, TODO: alert has no .getType().desc */
											fibre_name: route.name
											}));
				}
			}
		}
	} else {
		if (incident && incident.latitude && incident.longitude) {
			result = new LatLon(incident.latitude, incident.longitude);
		}
	}
	return result;
}

