/*
 * FILENAME:    alerts_dialog.js
 *
 * DESCRIPTION:
 *
 * LAST CHANGE:
 * $Author: $
 *   $Date: $
 *    $Rev: $
 *    $URL: $
 *
 * COPYRIGHT:
 * This file is Copyright © 2010 Fotech Solutions Ltd. All rights reserved.
 */

/**
 * options:
 *   isFixed: defines if this is a floating dialog, or if it should just be displayed as a panel somehwere
 *   dialogLocations: an array of the YUI dialog contexts.  This will also defined the number of dialogs
 *      that should popup (by its length)
 *      these value will be used to set the detail dialog contexts and so should
 *      follow YUI's standards for context. namely: [div_id, corner of dialog, corner of div]
 *      where the "corners" can be tl (top left), tr (top right), bl (bottom left), br (bottom right)
 */
AlertsDialog = function (dialogId, options) {
    options = options || new Hash();
    this.isFixed = options.isFixed || false;
    this.dialogLocations = options.dialogLocations || [];
    this.numDetailsDialogs = this.dialogLocations.length;
    this.alertTypes = options.alertTypes;
    //this.threatLevelsToShow = options.threatLevelsToShow || [];
    //this.threatLevelsToPopup = options.threatLevelsToPopup || [];
    this.noAdd = options.noAdd || false;

    this._dialogs = {};

    this.dialogId = dialogId;
    this.alert_template = null;

    this.tearoff = options.tearoff || false;

    var getDialogOption = function( reaction, fallback ) {
        try {
            return vueApp.$store.getters[ 'alerts/levels' ]( reaction );
        } catch ( e ) {
            return fallback;
        }
    };

    /* Override the threat levels to show using the store to determine it */
    Object.defineProperties( this, {
        'threatLevelsToShow': {
            get: function() {
                return getDialogOption( 'list', options.threatLevelsToShow || [] );
            }
        },
        'threatLevelsToPopup': {
            get: function() {
                return getDialogOption( 'dialogs', options.threatLevelsToShow || [] );
            }
        },
        'threatLevelsToIcon': {
            get: function() {
                return getDialogOption( 'icons', options.threatLevelsToShow || [] );
            }
        }

    });

    this.setupListeners();
    this.handleAlertUpdate();


};

//Setting up listeners that will do things based on when the globalAlertManager changes
AlertsDialog.prototype.setupListeners = function () {
    var g = fotech.gui.rootOpener().globalAlertManager;

    var callback = fotech.debounce( this.handleAlertUpdate, 500 ).bind(this);

    g.observe('alert:add', callback);
    g.observe('alert:update', callback);
    g.observe('alert:remove', this.handleAlertUpdate.bind( this ) );
    g.observe('alert:removeMultiple', this.handleAlertUpdate.bind( this ) );

    /* Create a timer which will periodically update any event marker (which tracks
     * when the event was acknowledged) */

    setInterval( function(){
        document.querySelectorAll('.alert_time[data-core-alert-time]').forEach( function(timeArea){
            var created = new Date( timeArea.getAttribute('data-core-alert-time') );
            var updated = new Date( Date.now() );

            var elapsed = (new Date( updated - created)).elapsed();

            if ( elapsed == "" ){
                elapsed = "now";
            }

            timeArea.textContent = elapsed;
        });
    }, 60000 );

    Event.observe(document, 'fotechmap:alertclicked', function (ev) {
        var alert_obj = ev.memo || {};

        if (typeof alert_obj.id != "undefined") {
            try {
                /* Portal and Admin UI code has been merged, meaning that the listener for
                 * both is present and will show the dialogs (or popup windows) accordingly
                 * however, since the portal does *more* after the fact, it should be the
                 * thing which does the handling */
                // this.show(alert_obj.id, { bringToTop: true });
            } catch ( e ){
                console.log( "Unable to show most recent alert:", alert_obj.id, e );
            }
        }
    }.bind(this));
}

AlertsDialog.prototype.handleAlertUpdate = function ( ev ) {

    var g = fotech.gui.rootOpener().globalAlertManager;
    var ids;

    if ( ev && ev.memo && ev.memo.ids ){
        if ( !Array.isArray( ev.memo.ids ) ){
            ids = [ ev.memo.ids ];
        } else {
            ids = ev.memo.ids;
        }
    }

    //sort alerts by time descending
    var sortedList = g.asArray().sort(function (a, b) {
        return Date.parseXMLDateTime(b.time) - Date.parseXMLDateTime(a.time);
    });

    /* remove any stale alerts, those are any dialogs which are for alerts no longer registered,
       or update those which are already open */

    Object.keys( this._dialogs ).forEach( function(id){
        var al = g.get(id);
        if ( al ){
            if ( this._dialogs[id].dialog.isVisible() ){
                this._dialogs[id].refresh(al);
            }
        } else {
            this._dialogs[id].dialog.hide();
            delete this._dialogs[id];
        }
    }.bind(this));

    if ( this.noAdd ){
        return;
    }

    //clear the table of list items (not other markers) and add all the elements again
    var tableElements = $$('#' + this.dialogId + ' ul');

    /* Do we have a table lement ? */
    if ( !tableElements || tableElements.length == 0 ){
        return;
    }

    var tableElm = tableElements[0];

    /* Find each table body and remove it, unless it is a data-core-days-away marker */
    tableElm.querySelectorAll( 'ul:not([data-core-days-away])' ).forEach( function( body ){
        body.remove();
    });

    /* we need to generate a list of all the alerts we currently have listed
     * as the global event manager may have removed them and we need to keep
     * the UI in sync */

    var currentAlerts = [].slice.call( document.querySelectorAll('[id^="alert_id_"]') ).map(function(a){ return a.id.replace(/alert_id_/,'' ) } );

    /* we then need to produce a list of the actually relevant alerts, that
     * is the combination of all the events we currently have shown as well
     * as the list of events which are stored in the global event manager */

    var allAlertIds = currentAlerts.concat( sortedList.map( function(a){ return a.id } ));

    var allAlerts = allAlertIds.reduce( function(res,id){

        /* Get the Alert from the Alert manager */
        /* Without cloning, clone the object */
        var globalAlert = g.get( id );
        var alert = undefined;
        
        if ( globalAlert ){
            alert = JSON.parse( JSON.stringify( globalAlert ));
        }

        /* It is possible the id we use has been transposed */
        try {
            id = vueApp.$store.getters[ 'alerts/id' ]( id );
        } catch ( e ){
        }

        if ( alert ) {
            alert.id = id;
        }

        var alertListItem = document.getElementById( 'alert_id_' + id );
        var time  = 0;

        try {
            if ( alert ){
                time = Date.parseXMLDateTime( alert.time );
            }
        } catch ( e ){
            console.log( "Unable to update alert time from details", e );
        }
        if ( alertListItem ){
            var timeFromAlert = alertListItem.getAttribute('data-core-alert-time');
            if ( timeFromAlert ){
                time = new Date( alertListItem.getAttribute('data-core-alert-time') );
            }
        }

        /* Check to see if we have this alert already, and if we do check
         * that the time of that alert is not later than this one, this is
         * intended to prevent alerts with duplicate UUIDs but different
         * IDs from interfering with each other, in these cases we use
         * the details of the most recent alert */
        if ( !res[ id ] || res[ id ].time <= time ) {
            res[ id ] = { item: alertListItem, alert: alert, time: time, id: id };
        }
        return res;

    }, {} );

    var checkExclusions = function( alert, existing ) { 
        if ( this.threatLevelsToShow && !this.threatLevelsToShow.include(alert.threat_level)) {
            /* We aren't to show threats of this level, so we can remove it
                and move onto the next alert */
            if ( existing ) {
                existing.remove();
                globalAlertManager.remove( alert.id );
            }
            return true;
        }

        /* Check to see if this alarm has been automatically resolved, if so
        we might have missed a "remove" operation, but the latest (lowest)
        alert_response should indicate that this is the case */

        try {
            var lastResponse = alert.alert_responses[ 0 ];
            if (
                lastResponse && lastResponse.response === 'resolve'
                &&
                lastResponse.comments
                &&
                lastResponse.comments.indexOf( 'auto_resolved_inactive' ) !== -1 ) {
                if ( existing ) {
                    existing.remove();
                    globalAlertManager.remove( alert.id );
                }
                return true;
            }
        } catch ( e ) {
            console.log( 'Unable to determine last alert response' );
        }
        return false;
    }.bind( this );


    Object.keys( allAlerts ).forEach( function( id ){
        /* Is this alert still present, not present and / or not relevant */
        var item = allAlerts[ id ];
        var alertListItem = item.item;
        var alert = item.alert;
        
        /* Check for staleness, that is we have an entry for it, but it's not
         * in the global event manager anymore */

        if ( alertListItem && !alert ){
            /* The item is stale, we can destroy it */
            try {
                alertListItem.remove();
            } catch ( e ){
                /* the node might have been removed, or not be in a list, so removing
                   it would be prone to fail */
            }
            return;
        } else if ( !alertListItem && alert ){
            /* We haven't got an entry for this alarm */
            if ( !checkExclusions( alert, null ) ) {
                if (this.threatLevelsToShow.include(alert.threat_level)) {
                    /* is the alert now resolved? if so, we should remove it */
                    this._addToList(alert);
                }
            }
            
            return;
        } else if ( alertListItem && alert ){
            /* we already know about this one, however, it might have changed and so
             * ideally we should update it */
            var current_level = alertListItem.getAttribute('data-core-threat-level');
            if ( current_level != alert.threat_level ){
                alertListItem.setAttribute('data-core-threat-level', alert.threat_level );
                [ 'red', 'amber', 'green' ].forEach( function(c){
                    alertListItem.classList.remove('threat_level_' + c );
                });
                alertListItem.classList.add( 'threat_level_' + alert.threat_level );
            }

            if ( !alert.listItem || !alert.listItemId ){
                alert.listItem = alertListItem;
                alert.listItemId = alertListItem.id;
            }

            var list = document.querySelectorAll('#' + this.dialogId + ' ul')[0];
            var position = this._getListPosition( list, alert ) || list;

            /* The position here is essentially which section to add the item
            to, such as "today", "yesterday" and so on */

            var existing = document.getElementById( alert.listItemId );

            if ( checkExclusions( alert, existing ) ) {
                return;
            }

            position.appendChild( existing );
            
            /* Check whether the alert is currently open in a panel or some other
               means of showing information.  This controls the blue highlight
               on the list entry and *not* the visibility of the Panel  */
            try {
                var hasOpenDialog = vueApp.$store.getters[ 'panels/visible' ]( id );
                var alert = document.getElementById( 'alert_id_' + id );
                if ( hasOpenDialog ){
                    alert.classList.add("details_visible");
                } else {
                    alert.classList.remove("details_visible");
                }
            } catch ( e ) {
                console.log( "Unable to highlight visible alert: ", e );
            }

            if ( alert.status != "new" ){
                alertListItem.querySelectorAll('.alert_notice').forEach( function(i){
                    i.classList.remove('new');
                });
            }
        }
    }.bind(this));

    this.sortAlerts();
}

AlertsDialog.prototype.sortAlerts = function() {
    
    var positions = FotechCore.getElementArray( document, ".coreDateMarker" );
    var self = this;

    positions.forEach( function( position ) {
        /* We have inserted our element into the correct list, so our item is in
        "position", however the items within position might be in the wrong order
        so we should resort them to be in the correct order */

        var children = [];
        
        /* Iterate through the children and create a sortable list of entries */
        var childElements  = position.childElements();
        for ( var i = 0; i < childElements.length ; ++i ){
            var el = {
                element: i,
                time: childElements[i].getAttribute( 'data-core-time' )
            };
            children.push( el );
        }

        var sortedChildren = children.concat().sort( self.sortAlert );

        for ( var i = 0; i < sortedChildren.length; ++i ){
            position.appendChild( childElements[ sortedChildren[ i ].element ] );
        }
    } );
}

AlertsDialog.prototype.sortAlert = function( a, b ){
    return b.time - a.time;
}

AlertsDialog.prototype.trimPopupId = function( alert ) {
    try {
        var lastActivity = alert.alert_responses[ alert.alert_responses.length - 1 ].response;
        return ( 
            ![ 'acknowledge' ].includes( lastActivity )
        );
    } catch ( e ) {
        return true;
    }
}

AlertsDialog.prototype._getListPosition = function( list, alert ){
    /* Take a look at the alert details (specifically its update time)
     * and determine a position in a list to add it at */

    /* Determine the position markers we have, these are denoted by a number of days
     * away that entries under them should be listed as, i.e. something 0 days away
     * was today, 1 day away was yesterday etc
     *
     * Check how many of these entries we have and that they are ready for taking
     * content */

    /* whilst doing so, we can work out where to place our entry too */
    var position;

    var now = Date.now();
    var time = Date.parseXMLDateTime( alert.time );

    if ( !this._seperators ){
        var seperators = Array.prototype.slice.call( list.querySelectorAll('ul[data-core-days-away]') );
        this._seperators = seperators.map( function( a ){
                    /* extract the number of days difference */
                    return {
                        days: parseInt( a.getAttribute('data-core-days-away') ),
                        element: a
                    };
               }).sort( function( a, b ){
                    /* go in reverse order */
                    return a.days - b.days;
               });
    }

    this._seperators.forEach( function(sep){
        var seperator = sep.element;

        /* create an expiry date, which is X days away */
        var expiry = new Date();
        expiry.setDate( expiry.getDate() - sep.days );

        /* because people consider most days to start at midnight then for anything other than
            * today, we should cut off that day as being midnight, this is because today isn't
            * technically 24 hours, and yesteray isn't always a day away */
        if ( sep.days > 0 ){
            expiry.setHours(23,59,59,0);
        } else if ( time > expiry ) {
            /* The alert occured in the future, consider this as being today */
            position = seperator;
        }

        if ( time < expiry ){
            position = seperator;
        }
    });

    return position;
}

AlertsDialog.prototype.tearDown = function(alertId){
    if ( this._dialogs[ alertId ] ){
        this._dialogs[alertId].tearoff = false;
    }
    this.show( alertId );
}

AlertsDialog.prototype.hide = function(alertId){
    if ( this._dialogs[ alertId ] ){
        this._dialogs[alertId].dialog.hide();
    }
}


AlertsDialog.prototype.show = function(alertId, options ){
    var a = fotech.gui.rootOpener().globalAlertManager.get(alertId)
    if ( !a ){
        return;
    }

    var tornOff = false;

    options = options !== undefined ? options : {};
    var offset  = options.offset ? options.offset * 20 : 0;
    var onlyNew = options.onlyNew ? options.onlyNew : false;

    options.wasOpenedByUser = options.wasOpenedByUser !== undefined ? options.wasOpenedByUser : true;

    var wasnew = false;

    if ( !this._dialogs[alertId] ){
        this._dialogs[alertId] = new AlertDetailsDialog('alert_details_dialog_user_' + alertId, {xy: [100 + offset, 100 + offset ]}, { wasOpenedByUser: options.wasOpenedByUser, alertId: alertId, tearoff: this.tearoff } );
        this._dialogs[alertId].dialog.hide();
        wasnew = true;
    }

    /* If we already have a dialog window (for some reason) then set the visibility flag to match */
    document.querySelectorAll('#alert_id_' + alertId)
            .forEach(function(e){
                e.classList.add('details_visible');
            });

    if ( onlyNew && !wasnew ){
        /* we don't want to see this popup as it wasn't new */
        // FIXME - Disabled for Comtel release, this will pop up any retriggered alarm return;
    }

    /* Check the status of the alarm, alarms which are being automatically popped up
     * should be in a new state and not have been acknowledged or resolved.  This will
     * prevent any alarms closed in other browsers (or at least acknowledged) from
     * repeatedly popping up */

    /* To compensate for retriggering (which needs to popup regardless of whether it
     * has been acknowledged or not) then we need to look at the responses */

    if ( !options.wasOpenedByUser
        && a.alert_responses !== undefined
        && [ 'acknowledge', 'acknowledged' ].includes( a.alert_responses[ a.alert_responses.length - 1 ].response ) ){
            console.log( "Suppressing automated popup for "  + a.id );
            return;
    }

    if ( this._dialogs[alertId].tearoff ){
        /* are we in tearoff mode ? */
        viewAlertWindow( alertId, false );
        tornOff = true;
    }

    this._dialogs[alertId].tearoff = tornOff;

    if ( tornOff ){
        this._dialogs[alertId].dialog.hide();
    } else {
        this._dialogs[alertId].refresh(a, options.bringToTop );
//        this._dialogs[alertId].dialog.show();
    }
}

AlertsDialog.prototype._addToList = function (theAlert) {

    var alertId = theAlert.id;

    try {
        alertId = vueApp.$store.getters[ 'alerts/id' ]( alertId );
    } catch ( e ){
    }    

    if ( !theAlert.listItem ){
        var item = this._createListItem(theAlert);
        theAlert.listItem = item.element;
        theAlert.listItemId = alertId;

        theAlert.showFullDetails = function(){
            try {
                vueApp.$store.dispatch( 'alerts/display', alertId );
            } catch ( e ){

            }
        }.bind(this);

        created = true;
    }

    var list = document.querySelectorAll('#' + this.dialogId + ' ul')[0];
    var position = this._getListPosition( list, theAlert ) || list;

    Element.insert(position, {top: theAlert.listItem});

    var menuItem = $('alert_id_' + theAlert.id);

    menuItem.observe('click', function (ev) {
        try {
            vueApp.$store.dispatch( 'alerts/display', alertId );
        } catch ( e ) {

        }
    }.bind(this));
};

AlertsDialog.prototype._createListItem = function (theAlert) {
    /* do we already have a dialog for this entry, which is currently visible ? */
    var hasOpenDialog = false;

    try {
        hasOpenDialog = vueApp.$store.getters[ 'panels/visible' ]( theAlert.id );
    } catch ( e ) {
        
    }

    if (
        this._dialogs &&
        this._dialogs[theAlert.id] &&
        this._dialogs[theAlert.id].dialog &&
        this._dialogs[theAlert.id].dialog.isVisible()
        
        ){
        hasOpenDialog = true;
    }

    var image_path = theAlert.tinyIcon + "";

    var title = theAlert.details['name'];

    if (!title) {
        title = getAlertDescription(theAlert);
    }

    if ( I18n.lookup( 'alert.name.' + theAlert['name'] ) ){
        title = I18n.lookup( 'alert.name.' + theAlert['name'] );
    }

    /* Watchdog alerts contain the "name" of the device they were monitoring
    (such as a Helios unit, Panoptes unit etc) and this should be used in
    place of the "name" of the Alert (as it is more specific),  this is returned
    as "name" under the details via the websocket, however the REST API flattens
    the "details" section out and returns this information as "component_name"
    instead, so we should transpose one over the other */

    if ( theAlert.details[ 'component_name' ] ) {
        title = theAlert.details[ 'component_name' ];
    }


    var status = theAlert.details['alarm-status'];
    if (!status)
        status = "alarm";

    var tag = theAlert.details['failed_coils'];
    if (!tag)
        tag = theAlert.details['tag'];

    /* determine the status of the alert, it could be acknowledged, or new or .. */
    var alert_notice_class = '';

    /* Determine the alerts duration */
    var created = new Date( Date.parseXMLDateTime(theAlert.time) );
    var updated = new Date( Date.now() );
    var alert_notice = created < updated ? (new Date( updated - created)).elapsed() : "";


    if ( !theAlert.time_resolved && !theAlert.time_acknowledged ){
        /* If the alert is not resolved, or acknowledged, treat it as new */
        alert_notice_class = "new";
    }

    if ( alert_notice == "" || alert_notice === undefined ){
        alert_notice = "now";
    }

    var id = 'alert_id_' + theAlert.id;
    var alert_time = Date.parseXMLDateTime( theAlert.time );

    var templateData = {
        alert_id: id,
        alert_time: alert_time.format("HH:MM:ss"),
        alert_date: alert_time.toLocaleDateString(),
        alert_timestamp: alert_time.getTime(),
        alert_threat_level: theAlert.threat_level || 'none',
        alert_title: title,
        alert_image: image_path,
        alert_tag: tag,
        alert_notice: alert_notice,
        alert_notice_class: alert_notice_class,
        alert_raw_time: created,
        details_visible: ( hasOpenDialog ? "details_visible": "" ),
        status_image: "/images/status/" + status + ".png"
    };

    var item = this._getAlertTemplate().evaluate(templateData);

    return { element: item, id: id };
};

AlertsDialog.prototype._getAlertTemplate = function () {
    if (this.alert_template == null) {
        this.alert_template = new Template("                                           \
            <li id='#{alert_id}' data-core-threat-level='#{alert_threat_level}' data-core-time='#{alert_timestamp}' class='alert_row threat_level_#{alert_threat_level} #{details_visible}'> \
                <span class='time'>#{alert_time}</span>                                \
                <span class='alert_image'>                                             \
                    <div class='alert_image_and_overlay' style='height: 18px'>         \
                        <img class='alert_image' src='#{alert_image}'/>                \
                        <img class='status_image_overlay' src='#{status_image}' />     \
                    </div>                                                             \
                </span>                                                                \
                <span class='alert_title'>#{alert_title}</span>                        \
                <span class='alert_tag'>#{alert_tag}</span>                            \
                <div class='alert_timings'>                                            \
                    <div class='alert_date'>#{alert_date}</div>                        \
                    <div class='alert_notice #{alert_notice_class}'>                   \
                        <span class='alert_new'>new</span>                                                        \
                        <span class='alert_time' data-core-alert-time='#{alert_raw_time}'>#{alert_notice}</span>                                                        \
                    </div>                                                             \
                </div>                                                                 \
            </li>");
    }

    return this.alert_template;
};

AlertsDialog.prototype._getAlertDetailsTemplate = function() {
    if ( !this.alert_details_template ){
        /* The template is (currently) a large amount of HTML in a
           Ruby ERB file, load up the template and keep track of
           it 
        this.alert_details_template =
            ''
 */
        //]
    }
    this.alert_details_template;
}

AlertsDialog.prototype.getAlertAgeInSeconds = function (theAlert) {
    return ((Date.now() - Date.parseXMLDateTime(theAlert.time)) / 1000);
}
/*******************************************************************************
 Alert details dialog code.
 *******************************************************************************/

AlertDetailsDialog = function (dialogId, dialogOptions, options) {
    options = options || {};
    this.options = options;
    this.dialogId = dialogId;
    this.dialog = new fotech.gui.FotechDialog(dialogId,
        $H({
            visible: false,
            width: '450px',
            constraintoviewport:true
        }).merge($H(dialogOptions)).toObject());
    this.dialog.setHeader(I18n.t('main.portal.basic_alert.title'));

    this.dialog.setBody('');
    this.dialog.render(document.body);
    if (typeof overlayManager != 'undefined')
        overlayManager.register(this.dialog);
    if (dialogOptions.context) {
        this.dialog.showEvent.subscribe(function () {
            this.dialog.cfg.setProperty('context', dialogOptions.context);
        }.bind(this));
    }
    this.alertId = options.alertId;
    this.sound = null;
    this.wasOpenedByUser = options.wasOpenedByUser;

    this.tearoff = options.tearoff || false;
    this.tearoffButton = new Element( 'span', { className: 'container-tear' });
    this.tearoffButton.appendChild( new Element( 'span', { className: 'fa fa-arrow-circle-up', 'data-fa-transform': 'rotate-45'} ));

    var alertId = this.alertId;

    this.tearoffButton.addEventListener('click', function(){
        this.tearoff = true;
        this.dialog.hide();
        if (typeof active_alerts_dialog !== undefined) {
            active_alerts_dialog.show( alertId )
        }
    }.bind(this) );

    this.dialog.appendToHeader( this.tearoffButton );

    this.dialog.hideEvent.subscribe(function () {
        /* remove the marker from the alert if it is available */
        document.querySelectorAll('#alert_id_' + alertId).forEach(function(e){ e.classList.remove('details_visible') });

        this.alertId = null;
        if (this.sound) {
            this.sound.pause();
            this.sound = null;
        }

        delete this;
    }.bind(this));

    this.dialog.showEvent.subscribe( function(){
        document.querySelectorAll('#alert_id_' + alertId).forEach(function(e){ e.classList.add('details_visible') });
    }.bind(this));

    //this.dialog.close
    // can't be set until we actually have a map
    this.alert_connector_layer = null;
    this._onMapUpdateHandler = this._onMapUpdate.bind(this);
    Event.observe(window, 'fotech:mapChanged', this._onMapUpdateHandler);
    // this.dialog.showEvent.subscribe(this.drawLineToMarker.bind(this));
    // this.dialog.hideEvent.subscribe(this.removeLineToMarker.bind(this));

    /* Create a timer which will periodically update any event marker (which tracks
     * when the event was acknowledged) */

    setInterval( function(){
        document.querySelectorAll('.alert_time[data-core-alert-time]').forEach( function(timeArea){
            var created = new Date( timeArea.getAttribute('data-core-alert-time') );
            var updated = new Date( Date.now() );

            var elapsed = (new Date( updated - created)).elapsed();

            if ( elapsed == "" ){
                elapsed = "now";
            }

            timeArea.textContent = elapsed;
        });
    }, 60000 );
};
