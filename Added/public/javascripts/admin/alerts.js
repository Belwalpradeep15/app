/*
 * FILENAME:    alerts.js
 * AUTHOR:      Steven Klassen
 * CREATED ON:  2010-08-05
 *
 * DESCRIPTION: Javascript for the alerts administration.
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

/** Admin namespace. */
var admin = (admin ? admin : {});

/** Alerts namespace. */
admin.alerts = (admin.alerts ? admin.alerts : {});
admin.alerts.portal = (admin.alerts.portal ? admin.alerts.portal : {});


/** Dialog used to add an alert response. */
admin.alerts.ResponseDialog = function() {
    var self = this;
    var cfg = {
    visible: false,
    constraintoviewport: true,
    postmethod: "manual",
    x: 10, y: 55,
    buttons: [
              { text: fotech.gui.labels.dismiss, handler: function(ev) { self.cancel(ev); } },
              { text: fotech.gui.labels.submit, handler: function(ev) { self.submitValues(ev); } }
              ]
    };

    fotech.gui.ValidatingDialog.call(this, 'response_dialog', cfg, 'response_form');
    this.showEvent.subscribe(function(){
        if(this.form.comment_tag){
            var lastTag = localStorage.getItem('comment_tag');
            this.form.comment_tag.value = lastTag;
        }
    }.bind(this))
    this.validateFields = function() {
        // Should be validating fields here for the Add Alarm Response Dialog.

        if (this.form.comments.value) {
            return true;
        }

        if (this.form.comment_required.value == 'true') {
            this._addError("", '', I18n.t('admin.alerts.response_dialog.errors.comment_required'));
            return false;
        } else {
            return true;
        }
    }
}

admin.alerts.ResponseDialog.prototype = new fotech.gui.ValidatingDialog();

/**
 * Validate and submit the form.
 */
admin.alerts.ResponseDialog.prototype.submitValues = function(ev) {
    if (this.validate()) {
        this.setBusyState();
        if(typeof(window.parentRequiresRefresh) != 'undefined')
            window.parentRequiresRefresh = true;
        var pathname = '/admin/alerts/'
        if(window.location.pathname.startsWith('/portal')){
            pathname = '/portal/alerts/'
            window.parentRequiresRefresh = window.location.pathname.startsWith('/portal/alerts');
        }

        //if this field is defined then keep track of the last value successfully submitted
        if(this.form.comment_tag){
            localStorage.setItem('comment_tag', this.form.comment_tag.value);
        }

        var alertId = this.form.alert_id.value;
        var response = this.form.response.value;

        new Ajax.Request(pathname + 'add_response', { method: 'post',
            parameters: Form.serialize(this.form),
            onSuccess: function(){
                if(window.location.pathname.startsWith('/portal/alerts')){
                    window.location.reload();
                } else {
                    admin.alerts._response_dialog.hide();
                    try {
                        /* Initially this code would only hide resolved alarms with acknowledged alarms
                         * being made to be visible and shown, however acknowledging an alarm has been
                         * deemed worthy of its closure too */
//                        if ( response == 'resolve' ){
                            active_alerts_dialog.hide( alertId );
//                        } else {
//                            active_alerts_dialog.show( alertId );
//                        }
                    } catch( e ){
                        console.log( "Unable to respond to", e );
                        /* if we can't close our dialog, we should reload the page */
                        location.reload();
                    }
                }
            }
        });
    }
}


/** Create the response dialog. */
admin.alerts._response_dialog = null;
admin.alerts.createResponseDialog = function() {
    if (!admin.alerts._response_dialog) {
        admin.alerts._response_dialog = new admin.alerts.ResponseDialog();
        admin.alerts._response_dialog.render(document.body);
        if(typeof overlayManager != 'undefined')
            overlayManager.register(admin.alerts._response_dialog);
    }
}

/** Bring up the dialog to add an alert response. */
admin.alerts.newResponse = function(alertId, alertType, responseType, commentRequired) {
    admin.alerts.createResponseDialog();
    var form = admin.alerts._response_dialog.form;
    form.reset();
    form.alert_id.value = alertId;
    form.response.value = responseType;
    form.comment_required.value = commentRequired;
    $('response_dialog_response_type').innerHTML = I18n.t('alert.response.' + responseType);

    // Since we might be in the main window, and we might be in a child window, we
    // have to see if getAlertDescriptionFromAlertName exists.
    var alertDescription = "";
    if (typeof(getAlertDescriptionFromAlertName) == "function") {
        alertDescription = getAlertDescriptionFromAlertName(alertType);
    }
    else if (typeof(window.opener.getAlertDescriptionFromAlertName(alertType)) == "function") {
        alertDescription = window.opener.getAlertDescriptionFromAlertName(alertType);
    }
    $('response_dialog_alert_type').innerHTML = alertDescription;

    /* A clunky way of determining where the alarm which generated this window was
     * located on screen */

    var parentDialog = document.getElementById( 'alert_details_dialog_user_' + alertId );
    if ( parentDialog ){
        try {
            var pos = parentDialog.getBoundingClientRect();
            var x = Math.max( parseInt( pos.left ) - 25, 0 );
            var y = parseInt( pos.top + 20 );

            admin.alerts._response_dialog.moveTo( x, y );
        } catch ( e ) {

        }

    }

    admin.alerts._response_dialog.show();
    if(admin.alerts._response_dialog.focus)
        admin.alerts._response_dialog.focus();
}

admin.alerts.portal.resolveAllAlerts = function(commentRequired){
    try {
        vueApp.$store.dispatch( 'alerts/displayBulkResolver', { resolution: 'resolve' } );
    } catch ( e ) {

    }
}

admin.alerts.portal.resolveAllFibreBreakAlerts = function(commentRequired){
   var g = fotech.gui.rootOpener().globalAlertManager;
   var alerts = g.getAllByAttribute('time_resolved',null);
   var fibreBreaks = alerts.select(function(x){
       return x.name == 'fibre_break_alert';
   });
   var ids = fibreBreaks.pluck('id');
   if(ids.length == 0){
       alert(I18n.t('admin.alerts.no_fibre_breaks_to_resolve'));
       return;
   }
   admin.alerts.massResponse('resolve', commentRequired, ids);
}

/** Bring up the dialog to add an alert response. */
admin.alerts.massResponse = function(responseType, commentRequired, ids) {
    var responseIds = [];
    if(ids){
        responseIds = ids;
    } else {
        $$('.select_check_box').each(
            function(cb){
                if( cb.checked ){
                    var uuid = cb.getAttribute( 'data-uuid' );
                    if ( uuid ){
                        responseIds.push( uuid );
                    } else {
                        responseIds.push(cb.value);
                    }
                }
            }
        );
    }
    if(responseIds.length == 0) return;

    try {
        vueApp.$store.dispatch(
            'alerts/displayBulkResolver',
            {
                resolution: responseType,
                ids: responseIds, mode: 'floating',
                onComplete: function() {
                    var parentRequiresRefresh = true;

                    vueApp.$store.dispatch( 'panels/removeAll', {} );

                    if(window.location.pathname.startsWith('/portal')) {
                        parentRequiresRefresh = window.location.pathname.startsWith('/portal/alerts');
                    }

                    if ( parentRequiresRefresh && window.parent ){
                        window.parent.location.reload();
                    }
                    window.location.reload();

                }
            
            } );
    } catch ( e ){

    }
}

/** Toggle the checkboxes in the first column on or off **/
admin.alerts.toggleAllCheckboxes = function(checkbox){
    $$('.select_check_box').each(function(cb){cb.checked = checkbox.checked;});
}

/** change the "select all" checkbox if a checkbox in the list has been deselected **/
admin.alerts.toggleSelectAllCheckbox = function(checkbox){
    if(checkbox.checked)
        return;
    $('check_all_top').checked = false;
}

/** Delete all alerts that have a checkbox, requires an form called 'updated_form' **/
admin.alerts.massDelete = function(){
    var deleteIds = [];
    try {
        vueApp.$store.dispatch( 'panels/removeAll', {} );
    } catch( e ) {

    }
    $$('.select_check_box').each(function(cb){ if(cb.checked) deleteIds.push(cb.value);});
    if(deleteIds.length == 0) return;
    var pathname = '/admin/alerts'
    if(window.location.pathname.startsWith('/portal')){
        pathname = '/portal/alerts/delete'
    }

    admin.deleteRecord(pathname, deleteIds.toString())
}

/** Create and show alert search dialog */
admin.alerts._search_dialog = null;
admin.alerts.showAlertSearchDialog = function(){
    if(!admin.alerts._search_dialog){
        admin.alerts._search_dialog = new admin.alerts.SearchDialog();
        admin.alerts._search_dialog.render(document.body);
    }
    admin.alerts._search_dialog.show();
}

admin.alerts.SearchDialog = function(){
    var self = this;
    var cfg = {
    visible: false,
    constraintoviewport: true,
    postmethod: "manual",
    x: 10000, y: 55,
    buttons: [
              { text: fotech.gui.labels.dismiss, handler: function() { self.cancel(); } },
              { text: fotech.gui.labels.submit, handler: function() { self.submit(); } }
              ]
    };
    fotech.gui.ValidatingDialog.call(this, 'alert_search_dialog', cfg, 'alert_search_form');

    this.showEvent.subscribe(this.onShowEvent.bind(this));

    this.validateFields = function() {
        $('start_timeId').value = $('start_timeId').value.strip();
        $('end_timeId').value = $('end_timeId').value.strip();
        this.validateDateOptionalTime("start_time", I18n.t("monitor.events.init_search.min_time"));
        this.validateDateOptionalTime("end_time", I18n.t("monitor.events.init_search.max_time"));
        this.validateIntegerExclusive("search[alert_id]", I18n.t('alert.detail_keys.alert_id'),0)
        this.validateFloatExclusive("search[route_min_distance_]", I18n.t('monitor.events.filters.min') + " "+ I18n.t('common.headers.distance') ,0)
        this.validateFloatExclusive("search[route_max_distance_]", I18n.t('monitor.events.filters.max') + " "+ I18n.t('common.headers.distance'),0)
        this.validateFloatExclusive("search[route_min_velocity_]", I18n.t('monitor.events.filters.min_velocity'),0)
        this.validateFloatExclusive("search[route_max_velocity_]", I18n.t('monitor.events.filters.max_velocity'),0)
    }
}
admin.alerts.SearchDialog.prototype = new fotech.gui.ValidatingDialog();

/**
 * Validate and submit the form.
 */
admin.alerts.SearchDialog.prototype.submit = function() {
    if (this.validate()) {
        this.setBusyState();
        alertFilterOnSubmit(this.form);
        $('start_timeId').value = $('start_timeId').value.strip();
        $('end_timeId').value = $('end_timeId').value.strip();
        $('search_startTimeXml').value = fotech.gui.toXmlDateTime($('start_timeId').value, false);
        $('search_endTimeXml').value = fotech.gui.toXmlDateTime($('end_timeId').value, true);
        this.form.submit();
    }
}

admin.alerts.SearchDialog.prototype.onShowEvent = function(){
    admin.alerts.SearchDialog.disableByCheckbox($('include_id'), "id_field");
    admin.alerts.SearchDialog.disableByCheckbox($('include_route'), "type_drop_down_list");
    admin.alerts.SearchDialog.disableByCheckbox($('include_type'), "type_check_box_list");
    admin.alerts.SearchDialog.disableByCheckbox($('include_status'), "status_check_box_list");
    admin.alerts.SearchDialog.disableByCheckbox($('include_threat'), "threat_check_box_list");
    admin.alerts.SearchDialog.disableByCheckbox($('include_date'), "date_table");
}

admin.alerts.SearchDialog.disableByCheckbox = function(checkbox, element_id){
    var el = $(element_id);
    if(!el) return;

    if(checkbox.checked){
        $$('#'+element_id+' input').invoke('enable');
        el.removeClassName('disabled');
    }else{
        $$('#'+element_id+' input').invoke('disable');
        el.addClassName('disabled');
    }

    if(element_id == "type_drop_down_list") {
        $('search_route_min_distance_').disabled = !checkbox.checked
        $('search_route_max_distance_').disabled = !checkbox.checked
        $('search_route_min_velocity_').disabled = !checkbox.checked
        $('search_route_max_velocity_').disabled = !checkbox.checked
    }
}
