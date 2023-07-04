/*
 * FILENAME:    search.js
 * AUTHOR:      Steven Klassen
 * CREATED ON:  2009-03-27
 *
 * DESCRIPTION: Javascript specific to the search page.
 *
 * LAST CHANGE:
 * $Author$
 *   $Date$
 *    $Rev$
 *    $URL$
 *
 * COPYRIGHT:
 * This file is Copyright (c) 2009 Fotech Solutions Ltd. All rights reserved.
 */

// The search criteria dialog.
var jssearch = null;

// The event ids current in the window.
var eventIdsStr = null;

// Keeps track of whether or not there are currently any results.
var resultCount = 0;

// Show or hide the search criteria dialog.
function showCriteria() {
    _createCriteriaDialog();
    enable();
    jssearch.show();
}

// Create the search criteria dialog. This method should be considered private.
function _createCriteriaDialog() {
    if (jssearch != null)
        return;

    var cfg = { visible: true, constraintoviewport: true, postmethod: "manual",
    x: 10000, y: 65, zIndex: 5,
    buttons: [ { text: fotech.gui.labels.dismiss, handler: function() { jssearch.cancel(); } },
              { text: "Search", handler: _handleCriteriaSubmit, isDefault: true, id: 'searchButton' } ]
    };
    jssearch = new fotech.gui.ValidatingDialog('criteria_dialog', cfg, 'criteria_form');

    jssearch.validateFields = function() {
        magnitudeFilterValidate(this);
        eventTypeFilterValidate(this);
        onROuteFilterValidate(this);
        if (this.form.restrictTime.checked) {
            this.validateDateOptionalTime("startTime", I18n.t("monitor.events.init_search.min_time"));
            this.validateDateOptionalTime("endTime", I18n.t("monitor.events.init_search.max_time"));
        }
        if(this.form.restrictId.checked){
            this.validateInteger("alertId", I18n.t('alert.detail_keys.alert_id'),0);
            this.validateInteger("eventId", I18n.t('monitor.events.filters.event_id'),0);
        }
        this.validateInteger("limit", I18n.t('monitor.events.init_search.limit'), 1);
    }

    jssearch.enable = function() {
        _initCriteriaDialogState(document.getElementById('criteria_form'));
    }
    jssearch.currentLineId =  -1;
    jssearch.render(document.body);
    if(typeof overlayManager != 'undefined')
        overlayManager.register(jssearch);
}

// Perform the search. This method should be considered as private to this file.
function _handleCriteriaSubmit() {
    _doSubmit(true);
}

// Perform the search. This method should be considered as private to this file.
function _doSubmit(haveLimit) {
    if (jssearch.validate()) {
        // Copy any necessary state into the hidden fields.
        var form = jssearch.form;
        if (form.restrictToCurrentFibreLine.checked)
            form.currentLineId.value = fotech.gui.rootOpener().displayedFibreLineId;
        if (form.restrictToSpatialFilter.checked) {
            //((lat1, long1), (lat2, long2))
            form.spatialBounds.value = fotech.gui.rootOpener().selectedRegionBounds.toString();
            form.depthBounds.value = fotech.gui.rootOpener().selectedDepthBounds;
        }
        form.fibreLineIds.value = _getFibreLineIds();
        form.selectedEventTypeIds.value = fotech.gui.getSelectedOptions(form.eventTypes);
        form.startTimeXml.value = fotech.gui.toXmlDateTime(form.startTime.value, false);
        form.endTimeXml.value = fotech.gui.toXmlDateTime(form.endTime.value, true);
        if (!haveLimit)
            form.limit.value = '';

        magnitudeFilterOnSubmit(form);
        onRouteFilterOnSubmit(form);
        _searchStarted();
        // Perform the search.
        new Ajax.Updater('searchResults',
                         prefixOrPortal('/monitor')+'/events/search',
                         { asynchronous:true,
                           evalScripts:true,
                           parameters:Form.serialize(form),
                           onComplete: _searchCompleted });
    }
}

function _searchStarted() {
    _enableButton('Search', false);
    jssearch.setBusyState();
};

function _searchCompleted() {
    _enableButton('Search', true);
    jssearch.clearBusyState();
    jssearch.storeState();
};

function _enableButton(buttonName, buttonEnabled) {
  jssearch.getButtons().each( function(button) {
    if (button.textContent == buttonName) {
      button.disabled = !buttonEnabled;
    }
  } );
};

// Perform the search but without the limit.
function downloadWithNoLimit(url) {
    if(confirm(I18n.t("monitor.events.init_search.time_warning"))){
        window.location = url;
    }
}

// Get the fibre line ids currently in the application. This method should be considered private.
// TODO:  actually, it should be defined where the fibreLines object is and used from there
function _getFibreLineIds() {
    var idstr = "";
    var lines = fotech.gui.rootOpener().fibreLines;
    if (lines.length > 0) {
        idstr = idstr + lines[0].id;
        for (var i = 1; i < lines.length; ++i)
            idstr = idstr + "," + lines[i].id;
    }
    return idstr;
}

// Init the state of the criteria dialog. This method should be considered private.
function _initCriteriaDialogState(form) {
    _enable(['spatialCheckbox'], [form.restrictToSpatialFilter], (fotech.gui.rootOpener().selectedRegionBounds != null || fotech.gui.rootOpener().selectedDepthBounds != null));
    _enable(['currentLineCheckbox'], [form.restrictToCurrentFibreLine], (fotech.gui.rootOpener().displayedFibreLineId != null));
    var line = null;
    if (fotech.gui.rootOpener().displayedFibreLineId != null) {
        line = fotech.gui.rootOpener().getFibreLineById(fotech.gui.rootOpener().displayedFibreLineId);
        document.getElementById('fibreLineName').innerHTML = "(" + line.name + ")";
    }
    _enable(['timeRow', 'startTimeImg', 'endTimeImg','timeFormatRow'], [form.startTime, form.endTime], form.restrictTime.checked);
    eventTypeFilterEnable(form);
    magnitudeFilterEnable(form);
    onRouteFilterEnable(form);
    if (jssearch.currentLineId != fotech.gui.rootOpener().displayedFibreLineId) {
        var count = 0;
        var et = fotech.gui.rootOpener().eventTypes;
        for (var i = 0; i < et.length; i++) {
            if (line == null || line.eventCategoryIds[et[i].eventCategoryId] == true)
                form.eventTypesList.options[count++] = new Option(et[i].description, et[i].id);
        }
        form.eventTypesList.options.length = count;
        jssearch.currentLineId = fotech.gui.rootOpener().displayedFibreLineId;
    }
    _enable(['restrictIdRow'],[form.alertId, form.eventId], form.restrictId.checked);
}


// Enable/disable items. This method should be considered as private to this file.
function _enable(ids, fields, flag) {
    if (ids != null)
        jssearch.enableItems(ids ,flag);
    if (fields != null)
        jssearch.enableFields(fields, flag);
}


// Enable/disable the search window items based on the current state.
function enable() {
    if (jssearch != null)
        jssearch.enable();
    fotech.gui.enableMenuItem(jsmenubar, 'postToDisplay', resultCount > 0 && resultCount <= 100);
    fotech.gui.enableMenuItem(jsmenubar, 'print', resultCount > 0);
    fotech.gui.enableMenuItem(jsmenubar, 'clear', resultCount > 0);
}

// Clear the search results.
function clearSearchResults() {
    if (resultCount > 0) {
        var dom = new fotech.dom.Dom(document);
        $('searchResults').update("");
        resultCount = 0;
        setStatusMessage(null, null);
        enable();
    }
}

// Post a set of events to the main display.
var _resultsToPost = "";
function postSearchResultsToMainDisplay(idsStr) {
    jssearch.setBusyState();
    fotech.gui.FotechDialog.setBusyState('content');

    _resultsToPost = idsStr;
    setTimeout("_postInBackground()", 1);
}

function _postInBackground() {
    fotech.gui.rootOpener().postEvents(_resultsToPost);
    jssearch.clearBusyState();
    fotech.gui.FotechDialog.clearBusyState('content');
}

function more_dropdown(event_track_id) {
    let tracks = document.getElementsByClassName("track_" + event_track_id);
    let more_image = document.getElementById("more_" + event_track_id);
    let less_image = document.getElementById("less_" + event_track_id);

    for (var i = 0; i < tracks.length; i++) {
		tracks[i].style.display="";
	}
    	
    more_image.style.display="none";
    less_image.style.display="";
}
                       			
function less_dropdown(event_track_id) {
    let tracks = document.getElementsByClassName("track_" + event_track_id);
    let more_image = document.getElementById("more_" + event_track_id);
    let less_image = document.getElementById("less_" + event_track_id);

    for (var i = 0; i < tracks.length; i++) {
		tracks[i].style.display="none";
	}
    	
    more_image.style.display="";
    less_image.style.display="none";
}
