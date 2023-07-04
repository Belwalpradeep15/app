/*
 * FILENAME:    alerts.js
 * AUTHOR:      Steven Klassen
 * CREATED ON:  2010-08-09
 *
 * DESCRIPTION: Alert related code common to both the main application and the
 *              admin sub-application.
 *
 * LAST CHANGE:
 * $Author$
 *   $Date$
 *    $Rev$
 *    $URL$
 *
 * COPYRIGHT:
 * This file is Copyright © 2010 Fotech Solutions Ltd. All rights reserved.
 */

/** View the alert window for a specific alert.
 ** forceCentre - will center the script when it opens
 ** newAlert - specifies that this is a new alert incoming alert, and not
 **            just viewing an alarm through the alarm search
 **/
viewAlertWindow = function(alertId, forceCentre) {
    try {
        if ( String( alertId ).indexOf( '_' ) == -1 ){
            alertId = 'local_' + alertId;
        }

        vueApp.$store.dispatch( 'alerts/display', alertId );
        /*
        var manager = fotech.gui.rootOpener().childWindows;
        var params = "";
        if (forceCentre)
            params = "?centre=true";
        var pathname = '/admin/alerts/'
        if(window.location.pathname.startsWith('/portal')){
            pathname = '/portal/alerts/'
        }
        var url = pathname + alertId + params;
        var aWindow = manager.registerChild('alert_' + alertId, window.open(url, "Alert" + alertId, "width=650,height=550"));

        if(aWindow){
            aWindow.focus();
            return aWindow;
        } */
    } catch (ex) {
        alert(ex);
    }
    return null;
};

Event.observe(document, 'fotechmap:alertclicked', function(ev) {
    window.showAlert(ev.memo)}
);

Event.observe(window, 'fotech:mapChanged', function(ev){
    try {
        if ( vueApp.$store.state.alerts.map !== jsmap ){
            vueApp.$store.state.alerts.map = jsmap;
        }
        vueApp.$store.commit( 'alerts/mapMove', ev.memo );
    } catch ( e ) {

    }
});

window.addEventListener( 'vueLoaded', function(){
    window.vueApp.$store.dispatch( 'actions/subscribe', [ 'panels/show', function( [ type, id ] ){
        var alert = document.getElementById( 'alert_id_' + id );
        if ( alert ){
            alert.classList.add("details_visible");
        }
    }]);
    window.vueApp.$store.dispatch( 'actions/subscribe', [ 'panels/remove', function( [ type, id ] ){
        var alert = document.getElementById( 'alert_id_' + id );
        if ( alert ){
            alert.classList.remove("details_visible");
        }
    }]);
})


document.addEventListener("DOMContentLoaded", function() {
    /* Add notification and toast notifications */

    var notify = function(ev){
        var severities = {
            'red': 'error',
            'orange': 'warning',
            'green': 'ok',
        };

        try {
            ev.memo.ids.forEach( function(id){
                if ( FotechCore.feature('alarmNotifications')){
                    var alert = globalAlertManager.get( id );

                    if ( !alert ){
                        console.log( "Unable to find any alert details matching ", id );
                        return;
                    }

                    if (typeof active_alerts_dialog !== undefined && active_alerts_dialog.threatLevelsToShow.includes( alert.threat_level )) {
                        /* Determine the alerts duration */
                        var alert_notice = "";
                        try {
                            var created = new Date( Date.parseXMLDateTime( alert.time ) );
                            var updated = new Date( Date.now() );
                            alert_notice =
                                created + " (" +
                                (new Date( updated - created)).elapsed() +
                                ")";
                        } catch ( e ){
                            console.log( "Unable to parse time from alert details:", e );
                        }

                        var icon = 'bell fas';

                        /* Check for retriggering status */
                        if ( alert.alert_responses && alert.alert_responses.length > 0 ){
                            switch ( alert.alert_responses[ alert.alert_responses.length - 1 ].response ){
                                case 'retrigger':
                                    icon ='sync-alt fas';
                                    break;

                                default:
                                    break;
                            }
                        }

                        FotechCore.notifications.add( {
                            icon: icon,
                            severity: severities[ alert.threat_level ],
                            title: getAlertDescription( alert ),
                            message: alert_notice
                        });
                    }
                }

            });
        } catch( e ){
            /* Unable to process this ID */
        }
    }

    globalAlertManager.observe( 'alert:add', notify );
    globalAlertManager.observe( 'alert:update', notify );

    /* Check for an empty alert dialog and bind the correct REST
     * API loader if/as required */

    var alertTemplate = document.getElementById( 'alert_data_details_0' );
    var alertSpinner = document.getElementById( 'alert_spinner' );

    var updateVisibleAlarms = function( ev ){
    };

    //globalAlertManager.observe( 'alert:add', updateVisibleAlarms );
    //globalAlertManager.observe( 'alert:update', updateVisibleAlarms );

    /* Create a generic callback function to add/updated/remove alerts
       from the Vue Storage whenever the globalAlertManager is manipulated */

    var vueActions = function( ev, operation ){
        /* Get the list of alerts (in ev.memo.ids), retrieve the alert from
         * the globalAlertManager and pass it into the store */
        try {
            ev.memo.ids.forEach( function(id){
                var alert = globalAlertManager.get( id );
        		if ( alert ){
                	vueApp.$store.dispatch( 'alerts/' + operation, alert );
        		}
            });
        } catch ( e ){
            console.log( "Unable to perform " + operation + " on Vue Alert store", e );
        }
    };

    var toRemove = [];
    /* Rate limit alert removals to prevent the vue action being swamped */
    var commitAction = fotech.throttle( function( operation ){
        /* Get the list of alerts (in ev.memo.ids), retrieve the alert from
         * the globalAlertManager and pass it into the store */
        try {
            vueApp.$store.dispatch( 'alerts/remove', toRemove );
            toRemove = [];
        } catch ( e ){
        }
    }, 500 );

    var vueRemovalActions = function( ev, operation ){
        toRemove = toRemove.concat( ev.memo.ids );
        commitAction();
    };

    globalAlertManager.observe( 'alert:add', function(ev){
        vueActions( ev, 'add' );
    } );
    globalAlertManager.observe( 'alert:update', function(ev){
        vueActions( ev, 'update' );
    } );
    globalAlertManager.observe( 'alert:remove', function(ev){
        vueRemovalActions( ev );
    } );
    globalAlertManager.observe( 'alert:removeMultiple', function(ev){
        vueRemovalActions( ev );
    } );

    return;
});

showAlert = function(alert) {
    try {
        vueApp.$store.dispatch( 'alerts/display', alert.id );
    } catch ( e ){

    }
};

/** Fetch the alert window, but do not display it.
 ** newAlert - specifies that this is a new alert incoming alert, and not
 **            just viewing an alarm through the alarm search
 ** This is because the alert that the pushdaemon gives is incomplete, we need the more complete json.
 **/
fetchFullAlert = function(alertId, alertDetails){
    try {
        var params = "";
        var pathname = '/admin/alerts/'
        if(window.location.pathname.startsWith('/portal')){
            pathname = '/portal/alerts/'
        }

        /* Determine how to handle this alert, we will either know about it already, or we won't
         * if we already know about it, then we should refresh the information about it (possibly
         * including the full details), if we don't, then we should retrieve information about it
         * and render that new information accordingly */

        /* retrieve the global alert manager */
        var g = fotech.gui.rootOpener().globalAlertManager;

        /* It is possible that the alert details were passed into us via the orignal message
         * which likely stems from a websocket message.  As of Aggregate Panoptes the message
         * contains the full alert details so there is no need to make an additional AJAX
         * request to fill in the blanks,  check for the presense of these details and use
         * them accordingly when they are available. */

        if ( alertDetails && typeof( alertDetails ) === 'object' ){
            var alert = g.get( alertId );

            /* reconstitue any missing details (if they are missing) */

            /* firstly add the ID back into the alert details */
            alertDetails.internal.id = alertId;

            /* and rebuild the alert name and event name where required, these should be present
             * but have some seriously unfortunate side effects if they are missing, ergo we need
             * to replace any important parts */
            if ( alertDetails.internal.details ){

                /* The name is the alert_type + '_alert' */
                if ( !alertDetails.internal.name ){
                    alertDetails.internal.name = alertDetails.alert_type + '_alert';
                }

                /* Generate the details.icon and tinyIcon from the alert type.*/

                if ( !alertDetails.internal.details.icon ){
                    alertDetails.internal.details.icon = "/images/fotech/fibre/event_markers/" + alertDetails.alert_type + ".png";
                }

                if ( !alertDetails.internal.tinyIcon ){
                    alertDetails.internal.tinyIcon = "/images/fotech/fibre/small_event_markers/" + alertDetails.alert_type + ".png";
                }
                /* try to use the vue app icons */
                try {
                    /* If the event type has "event type" added to the front of it, remove it */
                    let eventName = ( alertDetails.alert_type || "" ).replace( 'eventType: ', '' );

                    if ( vueApp.$store.state.configuration.event_types[ eventName ] ){
                        let icon = 'small_image';
                        let imageName = vueApp.$store.state.configuration.event_types[ eventName ][ icon ];

                        alertDetails.internal.tinyIcon = imageName;
                        alertDetails.internal.icon = imageName;

                        alertDetails.internal.details = alertDetails.internal.details || {};
                        alertDetails.internal.details.icon = imageName;
                        alertDetails.internal.details.tinyIcon = imageName;
                    }
                } catch ( e ) {
                    console.log( "Unable to retrieve vue markers", e );
                }
            }

            alertDetails.internal.sender_uuids = alertDetails.sender_uuids;
            alertDetails.internal.messageSource = "websocket";

            var displayedLines = FotechRest.displayedFibreLines() || [];

            if( displayedLines.concat( [null, undefined] ).includes( (alertDetails.internal.details || {}).fibre_line_name) ){
                if ( alert ){
                    g.updateObject( alertId, alertDetails.internal );
                } else {
                    /* Check whether we are likely to be interested in this alert in the first place
                    if it is *not* a threat level we are interested in displaying then we can refrain
                    from adding it,  we should however consider updating it because we might have 
                    downgraded the alarms */
                    if (
                        active_alerts_dialog.threatLevelsToShow.include( alertDetails.internal.threat_level )
                        ||
                        active_alerts_dialog.threatLevelsToPopup.include( alertDetails.internal.threat_level )
                        ||
                        active_alerts_dialog.threatLevelsToIcon.include( alertDetails.internal.threat_level )
                        ) {
                        g.add( alertId, alertDetails.internal );
                    }
                }
            }

            return;
        }
    } catch (ex) {
        console.log( "Unable to handle alert", ex );
        alert(ex);
    }
    return null;
};

fetchOutstandingAlerts = function(){
    /* Function is no longer called as Alert updates are done via the websocket
    with those messages containing the required details */
    return;
};

fetchAlertsSince = function(time){
    var timeString = time.format("xmlDateTime",true);
    var pathname = '/admin/alerts/'
    if(window.location.pathname.startsWith('/portal')){
        pathname = '/portal/alerts/'
    }
    new Ajax.Request(pathname + 'fetch_alerts_since',
                     { evalScripts:true,
                     parameters: {time:timeString,authenticity_token:encodeURIComponent(authenticityToken)},
                        method: 'get' });
};


/**
 Given an alert JSON, return the description of that alert, either from the event
 or from the localization.
 */
getAlertDescription = function(alert) {
    return getAlertDescriptionFromAlertName(alert.name);
}

getAlertDescriptionFromAlertName = function(alertName) {
    if ( alertName && alertName.endsWith('_alert')) {
        var eventTypeName = alertName.replace(/_alert$/, "");
        var eventType = fotech.fibre.EventType.getEventTypeByName(eventTypeName);
        if (eventType != null) {
            return eventType.desc;
        }
    }
    if ( I18n.lookup( 'alert.name.' + alertName )){
        return I18n.t('alert.name.' + alertName);
    }
    try {
        return vueApp.$store.state.configuration.event_types[ alertName.replace('_alert', '')].description;
        
    } catch ( e ){

    }

    return alertName;
}

/* The alert position may be a string along the lines of "convert: XXXX m" rather than a
 * distance.  This is a clue to the UI that *this* distance should be converted on display
 * into the user's native format (presumably feet, inches, furlongs, leages etc) and
 * not rendered as meters.
 *
 * The distance is however guaranteed to be in meters, so we should introduce a mechansim
 * to convert back from this format into a simple Floating point number instead */

getAlertPosition = function(location) {
    return parseFloat( location.match( /[\d\.]+/g ) );
}

getDataSection = function( alertId ){
    /* Discover the alarm details, which are added as data attributes to the section
     * that contains the alarm details html themselves */

    var dataSection = document.getElementById( "alert_data_details_" + alertId );

    var data = {};
    var re = new RegExp( "^data-alert-(.*)$" );
    [].forEach.call( dataSection.attributes, function(attr) {
        /* We only want to preserve the data-alert- tags */
        var m = re.exec( attr.name );
        if ( m ){
            var tag = m[1];
            data[ tag ] = attr.value;
        }
    });

    data._section = dataSection;
    return data;
}

initAlertDetails = function( alertId ){
    var data = getDataSection( alertId );

    /* Correct the date */
    Date.fixDate("localAlertTime_" + alertId, data.time, Date.format.long);

    /* Determine some date formats depending upon status */
    switch( data.status ){
        case 'resolved':
            var res = data.time_resolved || data.resolved;
            Date.fixDate("localTimeDismissed_" + data.id, res, Date.format.long);
            break;
        case 'acknowledged':
            var ack = data.time_acknowledged || data.acknowledged;
            Date.fixDate("localTimeAcknowledged_" + data.id, ack, Date.format.long);
            break;
        default:
            break;
    }

    /* Fix the dates of each of the alert responses */
    data._section.querySelectorAll( '[data-response-data-id]' ).forEach( function( resp ){
        var responseId = resp.getAttribute('data-response-data-id');
        var responseTime = resp.getAttribute('data-response-data-time');
        if ( data.anonymous ){
            Date.fixDate("localResponseTime_" + responseId, responseTime, Date.format.simpleTime);
        } else {
            Date.fixDate("localResponseTime_" + responseId, responseTime );
        }
    });
};

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
    } catch (e){

    }
});

request_audio = function(json_response, child_identifier)
{
	var alert = json_response.responseJSON['alert']
	var alert_details = alert['details']
    var fibre_line_id = alert_details['fibre_line_id'];
    var fibreLine = fotech.gui.rootOpener().getFibreLineById(fibre_line_id);
    // The alert_details 'position' property can contain formatting information ('convert: 69 m')
    // which fails parseInt(). The optional_translate method should return a parseable string.

    // TODO: The response we get back here is in latitude and longitude,
    // so this location needs to be converted either here in the javascript
    // or in the backend before it arrives.
    var location = parseInt( alert_details['position'].split(" ")[1]);
    var start_m = location - 25; // Offset the start
    var end_m = location + 25; // Offset the end

    var title = 'alert_audio' + child_identifier;
    var aWindow = fotech.gui.rootOpener().childWindows.get(title);

    var start_time = alert['time'] + 'Z';
    var channel_id = fibreLine.helios_channel;

    var dataMessage;
    if (typeof alert_details['threatUUID'] == "undefined" ){
        dataMessage = {'audio_location_change': { 'start_m': parseInt(start_m), 'end_m': parseInt(end_m), 'start_time': start_time, 'channel_id' : parseInt(channel_id), 'play': true, 'child_identifier' : parseInt(child_identifier)}};
    } else {
        dataMessage = {'audio_location_change': { 'start_m': parseInt(start_m), 'end_m': parseInt(end_m), 'start_time': start_time, 'channel_id' : parseInt(channel_id), 'play': true, 'child_identifier' : parseInt(child_identifier), 'threat_uuid': alert_details['threatUUID'] }};
    }
    aWindow.postMessage( dataMessage, '*');
    aWindow.audioStarted = true;
}

/* No longer required due to the vue-ised Audio handler
Event.observe(window,'message:audio_loaded', function( ev ){
    var child_identifier = ev.memo;

    var pathname = '/admin/alerts/'
    if(window.location.pathname.startsWith('/portal')){
        pathname = '/portal/alerts/'
    }

	new Ajax.Request( pathname + child_identifier + '?format=json', {
		method: 'get',
		onSuccess: function(response){ var identifier = child_identifier; request_audio(response, identifier); }
	});
}); */

Event.observe(window, 'message:audio_unloaded', function(ev) {
    var child_identifier = ev.memo;

    var title = 'alert_audio' + child_identifier;
    var aWindow = fotech.gui.rootOpener().childWindows.get(title);

    if ( aWindow ){
        if ( aWindow.audioStarted ){
            aWindow.close();
        }
        aWindow.audioStarted = false;
    }
});

addAudioButton = function(alert_id, fibre_line_id) {
    var data;
    
    try {
        data = getDataSection( alert_id );

        if (!data){
            /* Unable (currently) to get the alert data from the DOM, try reading it
               from the vuaApp instead */
            try {
                console.log( "Loading data from vueApp", vueApp );
            } catch ( e ){
                console.log( "Unable to load audio data from vue", e );

            }
        }
    } catch ( e ){

    }

    if ( !data.audio ){
        return;
    }


    var id = alert_id;

    /* If we have a rootOpener, i.e. a parent window we should proceed as
       normal, and register any child windows with it so that they may be
       managed and maintained, if *not* then we must compensate for a lack
       of information, and handle window management ourselves */

    if ( fotech.gui.rootOpener() && fotech.gui.rootOpener().getFibreLineById ){
        var fibreLine = fotech.gui.rootOpener().getFibreLineById(fibre_line_id);
        var helios_host_name = fibreLine.heliosUnit.host_name;
        var title = 'alert_audio' + id;

        var aWindow = fotech.gui.rootOpener().childWindows.get(title);

        if (
            !aWindow
            ||
            !fotech.gui.rootOpener().childWindows.isOpen(title)
        ){
            aWindow = fotech.gui.rootOpener().childWindows.registerChild(title,
                        window.open('/monitor/audio/play?hostname=' + helios_host_name + '&id='+ id,
                            title,
                            "width=610,height=700,padding-right=10px;"
                        )
                    );
        }

        aWindow.focus();
    } else {
        /* We don't have a root opener, ergo we need to determine the audio
           player's hostname, that is the address of the helios unit as well
           as any other information and then handle the creation of an audio
           window ourselves */

        var alert_details = globalAlertManager.get( id );
        if ( alert_details ){
            var location = parseInt( alert_details.details['position'].split(" ")[1]);
            var start_m = location - 25; // Offset the start
            var end_m = location + 25; // Offset the end

            FotechRest.fibreLine( fibre_line_id, function(data){
                if ( data && data.properties && data.properties.helios_unit_id && data.properties.helios_unit_id.value ){
                    FotechRest.helios( data.properties.helios_unit_id.value, function( helios ){
                        window.open('/monitor/audio/play?hostname=' + helios.properties.host_name.value + '&id='+ id + '&start=' + start_m + '&end=' + end_m,
                            title,
                            "width=610,height=700,padding-right=10px;"
                        );
                    });
                }
            });
        }
    }

    return;
};
