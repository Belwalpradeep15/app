/* REST API Integration */

var FotechRest = {
    'baseURI': '/api/v1/',
    'options': {
        alertsRefreshInterval: ( 300000 ),
    },
    'cache': {
        fibreLines: {},
        fibreLine: {},
        helios: {},
    }
};

/* Return fibreline information */
FotechRest.fibreLines = function( callback ){
    var req = new Ajax.Request( FotechRest.baseURI + 'properties/fibreline', {
        method: 'get',
        onSuccess: function( response ){
            FotchRest.cache.fibreLines = response.responseJSON;
            if ( callback ){
                callback( response.responseJSON );
            }
        }
    });
};

/* Return a specific fibreline */
FotechRest.fibreLine = function( fibreline, callback ){
    var req = new Ajax.Request( FotechRest.baseURI + 'properties/fibreline/' + fibreline, {
        method: 'get',
        onSuccess: function( response ){
            FotechRest.cache.fibreLine[ fibreline ] = response.responseJSON;
            if ( callback ){
                callback( response.responseJSON );
            }
        }
    });
};

/* Return a specific fibreline */
FotechRest.helios = function( helios, callback ){
    var req = new Ajax.Request( FotechRest.baseURI + 'properties/helios/' + helios, {
        method: 'get',
        onSuccess: function( response ){
            FotechRest.cache.helios[ helios ] = response.responseJSON;
            if ( callback ){
                callback( response.responseJSON );
            }
        }
    });
};

FotechRest.types = {
    Alert: function( alert ){
        /* Reconsititute any missing "details" within the alert */
        if ( !alert.icon ){
            alert.icon = "/images/fotech/fibre/event_markers/" + (alert.alert_type || alert.name ) + ".png";
        }

        if ( !alert.tinyIcon ){
            alert.tinyIcon = "/images/fotech/fibre/small_event_markers/" + ( alert.alert_type || alert.name || "" ).replace( '_alert', '' ) + ".png";
        }

        /* try to use the vue app icons */
        try {
            /* If the event type has "event type" added to the front of it, remove it */
            let eventName = ( alert.alert_type || alert.name || "" )
                .replace( 'eventType: ', '' )
                .replace( '_alert', '' )
                .toLowerCase();

            if ( vueApp.$store.state.configuration.event_types[ eventName ] ){
                let icon = 'small_image';
                let imageName = vueApp.$store.state.configuration.event_types[ eventName ][ icon ];

                alert.tinyIcon = imageName;
                alert.icon = imageName;
            }
        } catch ( e ) {
            console.log( "Unable to retrieve vue markers", e );
        }

        /* The alert details when loaded via the REST api will be a list of
         * details that the rest API has provided in a flattened structure,
         * the mapping system expects this to be a hash of the details, so
         * reconsitute it accordingly */
        if ( alert.details && Array.isArray( alert.details )){
            var newDetails = {};
            alert.details.forEach( function( key ){
                newDetails[ key ] = alert[ key ];
            });
            alert.details = newDetails;
        }

        try {
            /* The REST API calls can return data which is not quite consistent
            internally.  The alert_responses list is updated *before* the 
            time_resolved field is updated rather than atomically (and hence
            at the same time) this means that we can get a REST API update which
            includes alerts which have been automatically resolved.  These
            alerts need to be ignored.  (see #26347) */

            if (
                alert.alert_responses
                &&
                alert.alert_responses[ 0 ]
                &&
                alert.alert_responses[ 0 ].response === 'resolve'
                &&
                alert.alert_responses[ 0 ].comments
                &&
                alert.alert_responses[ 0 ].comments.indexOf( 'auto_resolved_inactive' ) !== -1
            ) {
                return;
            }

            var alertId = alert.id;
            var currentAlert = globalAlertManager.get( alertId );
            if ( currentAlert ){
                globalAlertManager.updateObject( alertId, alert );
            } else {
                globalAlertManager.add( alertId, alert );
            }
        } catch ( err ){
            console.error( "Unable to register alert " , alert );
        }
    }
}


/* Alarms / Alerts / Events etc */
FotechRest.alerts = function( callback, params ){
    /* We may want / need to limit the amount of alerts we retrieve,
     * the alerts manager (or at least its dialog) will have a list
     * of alert levels to display, and some to popup as well, if
     * either of both of those lists are present, we should ask for
     * their union */

    /* do so inside a try / catch block on the off chance that the
     * variables don't exist or some other error happens when trying
     * to access global variables declared elsewhere */
    params = params ? params : {};

    try {
        params['level'] = active_alerts_dialog.threatLevelsToShow;
    } catch ( e ){
        console.log( "Unable to parse alert levels to include", e );
    }

    /* We don't wish to see resolved alerts, indeed we only want to see
     * new or acknowledged alerts so we should state this to the API */
    [ 'new', 'acknowledged' ].forEach( function(p){
        params[p] = true;
    });

    /* Ideally we want to restrict the list of Alerts we get to those
     * which happened on a fibreline we are currently actively viewing
     * this list is stored in the ever present global value
     * "displayedFibreLineIds" although the REST api wants us to determine
     * which to display by the fibreline name and *not* its ID (because
     * any child panoptes units will likely be using the same fibreline
     * ids as each other for different fibrelines) */

    params[ 'fibre_line_name' ] = FotechRest.displayedFibreLines();
    if ( !params[ 'fibre_line_name' ] ){
        FotechRest.alerts.refreshTimer = setTimeout( FotechRest.alerts, 500 );
        return;
    }

    FotechRest.longRunning( "alerts/update", function(results){
        /* Parse the results back into the event manager */
        try {
            /* if we are refreshing then we want to temporarily disable
             * the autopopup behaviour */
            if ( params && params[ 'suppress_popups' ] ) {
                vueApp.$store.state.alerts.autoPopup = false;
            }

            /* The results are keyed as the machine they are from
             * followed by the ID of the alert ... */

            var remoteIds = [];

            Object.keys( (results||[]) ).forEach( function( remoteId ){
                var remote = results[ remoteId ] || [];
                Object.keys( remote ).forEach( function(id){
                    var alert = Object.assign( {}, remote[ id ] );
                    remoteIds.push( alert && alert.uuid ? alert.uuid : id );

                    /* The ID for this alert needs to be transmogrified to
                     * denote where the alert came from */
                    var alertId = remoteId + '_' + id;

                    if ( remoteId != 'local' ){
                        alert.sender_uuids = [ remoteId, 'local' ];
                    } else {
                        alert.sender_uuids = [ 'local' ];
                    }

                    /* Make the ID CSS/HTML ID safe */
                    alertId = alertId.replace(/:/g,"_");
                    alert.id = alertId;

                    FotechRest.types.Alert( alert );
                });
                /* Once completed, we should turn on autopopups */

                if ( params && params[ 'suppress_popups' ] ) {
                    vueApp.$store.state.alerts.autoPopup = true;
                }

                vueApp.$store.dispatch( 'alerts/startAutoPopups', {} );
            });

            /* We might find ourselves in the situation where the list of
            alerts we currently have is not the same as the list we just
            received, in those cases we should go through the old list and
            remove those not in the new list */
            vueApp.$store.dispatch( 'alerts/sync', remoteIds );

        } catch ( e ){
            console.error( "Unable to process", e );
        }

        /* Loop over and periodically refresh the alerts */
        if ( FotechRest.alerts.refreshTimer ){
            clearTimeout( FotechRest.alerts.refreshTimer );
        }
        FotechRest.alerts.refreshTimer = setTimeout( 
            function(){
                FotechRest.alerts( function(){}, { suppress_popups: true } );
            },
            FotechRest.options.alertsRefreshInterval
        );

        callback( results );
    }, params );
}

/* Alarms / Alerts / Events etc */
FotechRest.alert = function( callback, params ){
    params = params ? params : {};

    var alertId = params['id'];

    FotechRest.longRunning( "alerts/" + alertId + "/update", function(results){
        /* Parse the results back into the event manager */
        try {
            /* The results are keyed as the machine they are from
             * followed by the ID of the alert ... */
        } catch ( e ){
            console.error( "Unable to process", e );
        }
        callback( results );
    }, params );
}

/* Ideally we want to restrict the list of Alerts we get to those
 * which happened on a fibreline we are currently actively viewing
 * this list is stored in the ever present global value
 * "displayedFibreLineIds" although the REST api wants us to determine
 * which to display by the fibreline name and *not* its ID (because
 * any child panoptes units will likely be using the same fibreline
 * ids as each other for different fibrelines) */

FotechRest.displayedFibreLines = function(){
    try {
        var fibrelines = vueApp.$store.state.aspects.aspects.fibreline;

        if ( Object.keys( fibrelines || [] ).length == 0 ){
            /* If we haven't got any fibrelines, or any that we know about we
             * can't really proceed in a meaningful way, so abandon this attempt
             * and retry in a few moments */
            throw( "Retry due to empty fibrelines list" );
        }

        var lineNames = displayedFibreLineIds.map( function(id){
            return fibrelines[ id ].properties.name.value;
        });

        return lineNames;
    } catch (e) {
        return null;
    }
}


/* Long running tasks return a task ID and - eventually - some results
 * When the status of the task is not "finished" then the task carries on
 * in the background and we need to wait a while before asking again */

FotechRest.longRunning = function( api, callback, params ){
    var url = FotechRest.baseURI + api;
    FotechRest.longRunningTask( api, '', callback, params );
}

FotechRest.longRunningTask = function( api, task_id, callback, params ){
    var url = FotechRest.baseURI + api + (task_id != '' ? ('/' + task_id) : '');
    var req = new Ajax.Request( url, {
        method: 'get',
        parameters: params,
        onSuccess: function( response ){
            var details = response.responseJSON;
            if ( !details.task_id ){
                console.error( "REST request to " + api + " failed, no task ID found", details );
                return;
            }
            if ( details.status && details.status == 'finished' ){
                return callback( details.results );
            }
            if ( details.status && details.status == 'failed' ){
                return callack( details.results );
            }

            /* By the time we get here, we are likely to have a task
             * which is still running, wait a little while and try again */
            setTimeout( function(){
                FotechRest.longRunningTask( api, details.task_id, callback );
            }, 2000 );
        }
    })
}
