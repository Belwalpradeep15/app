/*
 * FILENAME:    pushdaemon.js
 * AUTHOR:      Steven Klassen
 * CREATED ON:  2010-11-08
 * 
 * DESCRIPTION: Javascript related to the pushdaemon partial.
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

/** Monitor namespace. */
var monitor = (monitor ? monitor : {});

/** Push Daemon namespace. */
monitor.pushdaemon = (monitor.pushdaemon ? monitor.pushdaemon : {});

/* We respond to an error by popping up an alert dialog. */
monitor.pushdaemon.onError = function(msg) {
    alert(I18n.t('main.push_daemon.on_error', {msg: msg}));
}

/* We respond to other messages by displaying them in the status area. */
monitor.pushdaemon.onStatusMessage = function(msg) {
    setStatusMessage(I18n.t("" + msg), null); /* <!-- "" + needed to force java object to a string --> */
}

/* Determine the message type and dispatch it appropriately. */
monitor.pushdaemon.onMessage = function(msgType, msgStr) {
    try {
        if (msgType == "Event")
            monitor.pushdaemon._onEvent(msgStr);
        else if (msgType == "Alert")
            monitor.pushdaemon._onAlert(msgStr);
        else if (msgType == "Register")
            monitor.pushdaemon._onRegister(msgStr);
        else if (msgType == "Heartbeat")
            monitor.pushdaemon._onHeartbeat(msgStr);
        else if (msgType == "Connect") {
            monitor.pushdaemon._onHeartbeat(msgStr);    /* our response to a connect is to pulse a heartbeat */
            monitor.pushdaemon._onHealth(msgStr);       /* and to update the system health */
        }
        else if (msgType == "Disconnect")
            monitor.pushdaemon._onDisconnect(msgStr);
        else if (msgType == "Health")
            monitor.pushdaemon._onHealth(msgStr);
        else if (msgType == "Error") {
            monitor.pushdaemon._onError(msgStr);
        }
    }
    catch (e) {
        setStatusMessage(I18n.t('main.push_daemon.exception') + e, null);
    }
}

/* Events get installed via the addEvent global function. */
monitor.pushdaemon._onEvent = function(evstr) {
    var event = fotech.fibre.Event.createFromJSON(JSON.parse(evstr));
    var fibreLine = getFibreLineById(event.routeId); // Empty if user not permitted to see..
    if (fibreLine && displayedFibreLineIds.includes(fibreLine.id) ) {
        addEvent(event);
    }
}

/* We respond to a register method by recording the unique id and querying the system health.
 */
monitor.pushdaemon._onRegister = function(regMsg) {
    try {
        var json = JSON.parse(regMsg);
        pushDaemonId = json.unique_id;
        if ($('system_health_table_div') && monitor.system_health)
            monitor.system_health.request();
    }
    catch (e) {
        alert("Error in monitor.pushdaemon._onRegister: " + e);
    }
}

/* We respond to an alert by installing it in our display and in the lists that care. */
monitor.pushdaemon._onAlert = function(msgstr) {
    var al = JSON.parse(msgstr);

    // If we know it is resolved then we remove it from our manager, otherwise we need
    // to query its details.
    var am = fotech.gui.rootOpener().globalAlertManager;

    /* Attempt to rebuild the full ID for this alarm */
    if ( !al.sender_uuids || al.sender_uuids.length <= 1 ){
        al.id = "local_" + al.id;
    } else {
        /* discard the last UUID as that will be the aggregate panoptes */

        var ids = al.sender_uuids.slice(0);
        ids.pop();
        ids.push( al.id );

        al.id = ids.join( '_' );
    }

    fetchFullAlert(al.id, al);

    if (al.resolved_flag == 1 || al.deleted_flag == 1 ){
        am.remove(al.id);
    }

}

/* We respond to a disconnect by showing the broken heart and showing the system health 
 * window as busy. */
monitor.pushdaemon._isDisconnected = true;
monitor.pushdaemon._disconnectedAt = null;
monitor.pushdaemon._onDisconnect = function(msg) {
    monitor.pushdaemon._isDisconnected = true;
    monitor.pushdaemon._disconnectedAt = new Date();
    $('heartbeat').down('img').show();
    $('heartbeat').down('img').src = '/images/fotech/common_gui/broken_heart.png';
    
    var div = $('system_health_table_div');
    if (div) {
        div.addClassName('is_busy');
    }
    
    Event.fire(window, 'pushdaemon:disconnect', {msg:msg}); 
    if (typeof(additionalPushdaemonOnDisconnected) === 'function') {
        additionalPushdaemonOnDisconnected();
    }
}

/* We respond to a heartbeat by pulsing our heart icon. */
monitor.pushdaemon._onHeartbeat = function(hbMsg) {
    Event.fire(window, 'pushdaemon:heartbeat');
    $('heartbeat').down('img').show();
    $('heartbeat').down('img').src = "/images/fotech/common_gui/heartbeat.gif";
    if(monitor.pushdaemon._isDisconnected && monitor.pushdaemon._disconnectedAt){
            //if we were disconnected then we need to refresh the UI with any
            //alarms or events that were generated while disconnected
        if(!window.location.pathname.startsWith('/portal')){
            fetchEventsSince(monitor.pushdaemon._disconnectedAt);
            fetchAlertsSince(monitor.pushdaemon._disconnectedAt);
            try {
                FotechRest.alerts();
            } catch ( e ) {

            }
        }
    }
    monitor.pushdaemon._isDisconnected = false;
    monitor.pushdaemon._disconnectedAt = null;
    setTimeout("monitor.pushdaemon._pulse()", 2000);
}

monitor.pushdaemon._pulse = function() {
    if (!monitor.pushdaemon._isDisconnected)
        $('heartbeat').down('img').src = "/images/fotech/common_gui/heart.png";
}

/* We respond to a health change notice by performing a health update request if the
 * system health window exists.
 */
monitor.pushdaemon._onHealth = function(msg) {
    try {
        if ($('system_health_table_div') && monitor.system_health){
            monitor.system_health.request();	
        }
        if ($('helios_status_form') && monitor.helios){
        	monitor.helios.request();
        }
    }
    catch (e) {
        alert("Error in monitor.pushdaemon._onHealth: " + e);
    }
}

// We respond to some error messages, depending on what it is, by displaying a message
// in the status area.
monitor.pushdaemon._onError = function(msg) {
    var err = JSON.parse(msg);
    if (err.source == "WSMS" && err.code == 100) {
        setStatusMessage(I18n.t('main.push_daemon.messages.recovery_mode_disabled'), null);
    }
    else if (err.source == "RCDN") {    // Recovery done, code is number of events recovered.
        setStatusMessage(I18n.t('main.push_daemon.messages.recovery_complete', { count: err.code }), null);
    }
    else if (err.source == "RCIP") {    // Recovery in progress, code is number of events recovered.
        setStatusMessage(I18n.t('main.push_daemon.messages.recovery_in_progress', { count: err.code }), null);
    }
}

// Start in a disconnected state.
monitor.pushdaemon._onDisconnect(null);
if(!window.location.pathname.startsWith('/portal')){
    fetchOutstandingAlerts()
}

