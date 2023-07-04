/*
 * FILENAME:    menu.js
 * AUTHOR:      Steven Klassen
 * CREATED ON:  2009-02-25
 *
 * DESCRIPTION: Callbacks for the main menu.
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

function fibreLineView(path) {
  new Ajax.Request(path, { asynchronous: true, evalScripts: true, method: 'get'});
}

var mainViewType = null;

// Change the main view to that of the given fibre. If no fibre id is specified then
// we revert to the view of all fibres.

function setMainFibreView(fibreId, overviewType, overviewId, isPortalView) {

    var prefix = prefixOrPortal('/monitor');
    var viewType = overviewType || 'map';
    // Change the main display to the request fibre.
    var fibrePath = "";
    if (!fibreId && fibreLines.length == 1)
        fibreId = fibreLines[0].id;

    if (fibreId != null && !(fibreId instanceof Array)) {
        fibrePath = prefix + '/fibre_lines/' + fibreId;
        displayedFibreLineId = parseInt(fibreId);
        displayedFibreLineIds = [ parseInt(fibreId) ];
        var fibre = getFibreLineById(fibreId);
        mainViewType = fibre.viewType;
    } else {
        fibrePath = prefix + '/fibre_lines';

        if(fibreId instanceof Array){
            displayedFibreLineIds = fibreId;
            fibrePath += '/' + fibreId.join(',');
        }
        else
            displayedFibreLineIds = fibreLines.pluck('id');
        displayedFibreLineId = null;


        fibrePath += '?viewType=' + viewType;
        if (overviewId) {
          fibrePath += '&overviewId=' + overviewId
        }

        mainViewType = viewType;
    }

    console.log("displayedFibreLineID: " + displayedFibreLineId);
    new Ajax.Updater('content', fibrePath, {
                        asynchronous: true,
                        evalScripts: true,
                        method: 'get',
                        parameters: 'authenticity_token=' + encodeURIComponent(authenticityToken),
                        onComplete: function(){
                            /* Reset the Alerts list and cuase a REST call to refresh it */
                            globalAlertManager.clear();
                            globalEventManager.clearEvents();
                            closePopups();
                            FotechRest.alerts();
                        }
                    });

    // Update the status of the menu items.
    if(fibreId == null || fibreId instanceof Array)
        fibreId = -1;

    for (var i = 0; i < fibreLines.length; i++)
        fotech.gui.checkMenuItem(jsmenubar, 'fibre-' + fibreLines[i].id, (fibreLines[i].id == fibreId));

    // Redisplay the event popup if it is currently displayed.
    if (jsevent && jsevent.current_fibre_event) {
        jsevent.hideDisplayButton();
        popupEventWindow(jsevent.current_fibre_event);
    }

    // Enable/disable the filter items based on the current state.
    selectedRegionBounds = null;
    selectedDepthBounds = null;
    if (jsfilter) {
        jsfilter.enable();
    }

    // Tell the search window to re-enable its items if it exists.
    if (childWindows.isOpen('search')) {
        var wind = childWindows.get('search');
        wind.document.getElementById('results');
        wind.enable();
    }
}

// Display or hide the recent events.
function toggleRecentEvents() {
    var item = fotech.gui.getMenuItemById(jsmenubar, "showRecent");
    if (item.cfg.getProperty('checked')) {
        recent_events_dialog.dialog.show();
    }
    else {
        recent_events_dialog.dialog.hide();
    }
}

// Display or hide the recent events.
function toggleAlertList() {
    var item = fotech.gui.getMenuItemById(jsmenubar, "showAlertList");
    if (item.cfg.getProperty('checked')) {
        moveBackIntoWindow( multiple_alerts_dialog.dialog );
        multiple_alerts_dialog.show();
    } else {
        multiple_alerts_dialog.hide();
    }
}


// Toggle between showing the lat long under the mouse or not on the map view
function toggleShowLatLng(){
    var item = fotech.gui.getMenuItemById(jsmenubar, "showLatLng");
    var showLatLng = item.cfg.getProperty('checked');
    if(jsmap)
        jsmap.enableLatLngToolTip(showLatLng);
}

// Display a new page in the admin window.
function showAdminWindow(url) {
    childWindows.registerChild("admin", window.open(url));
    enableMenus();
}

// Display a new page in the admin window along with tz_offset only for alarm suppression schedule
function showAdminWindowForAlarmSchedule(url) {
    childWindows.registerChild("admin", window.open(url + '/?tz_offset=' + (new Date().getTimezoneOffset() * 60), "Admin"));
    enableMenus();
}

function showFibrePropertiesWindow(){
    var fibre = getFibreLineById(displayedFibreLineId);
    var url = "/admin/configuration/" + fibre.configurationId + "/edit";
    childWindows.registerChild("fibreproperties", window.open(url, "FibreProperties"));
    enableMenus();
}

// Show the user manual window.
function showUserManualWindow() {
    var wind = childWindows.get("usermanual");
    if (wind && !wind.closed) {
        wind.location = "/usermanual/html/monitor.htm";
        wind.focus();
    }
    else
        childWindows.registerChild("usermanual", window.open("/usermanual/html/monitor.htm", "UserManual"));
    enableMenus();
}

function showUserManualPDF() {
    childWindows.registerChild("usermanual-pdf", window.open("/usermanual/html/Content/Resources/Fotech%20Monitor%20Users%20Guide.pdf", "UserManualPDF"));
    enableMenus();
}

// Show the preferences window.
function showPreferencesWindow() {
    childWindows.registerChild("preferences", window.open(prefixOrPortal('/admin') + "/preferences", "Preferences", "menubar=no,toolbar=no,width=450,height=625"));
    enableMenus();
}

function updateLanguage(language){
    window.location = "/?locale=" + language;
}

function updateLanguagePortal(language) {
    window.location = "/portal?locale=" + language;
}

// Display the search window.
function openSearchWindow() {
    childWindows.registerChild('search', window.open(prefixOrPortal('/monitor') + '/events/initsearch', 'Search Results', 'menubar=no,toolbar=no'));
    enableMenus();
}
function openEventSearchWindowForAlert(alertId,search_params){
    var tz_offset = new Date().getTimezoneOffset();
    var search_params = JSON.stringify(search_params);
    childWindows.registerChild('search', window.open(prefixOrPortal('/monitor') + '/events/initsearch?restrictId=1&alertId='+alertId +'&tz_offset='+tz_offset+'&alert_search='+search_params, 'Search Results', 'menubar=no,toolbar=no'));
    enableMenus();
}
function downloadEventsForAlert(alertId,search_params){
    var tz_offset = new Date().getTimezoneOffset();
    var search_params = JSON.stringify(search_params);
    window.location = prefixOrPortal('/monitor') + '/events/search.csv?restrictId=1&alertId='+alertId +'&tz_offset='+tz_offset+'&alert_search='+search_params;
}


// Close all popup windows.
function closePopups() {
    childWindows.forEach(function(key, wind) { wind.close(); });
    try {
        vueApp.$store.dispatch( 'panels/removeAll', { type: [ 'Alert', 'RemoteAudio' ] });
    } catch ( e ) {
        console.log( "Unable to close down vue panels" );
    }
    setTimeout(enableMenus, 1000);
}

// Enable/disable menu items based on the current state.
function enableMenus() {
    if (!jsmenubar) {           // menu hasn't loaded yet, so try again later
        setTimeout(enableMenus, 1000);
        return;
    }

    var haveOneOpen = false;

    childWindows.forEach(function(key, wind) { if (childWindows.isOpen(key)) haveOneOpen = true; });
    fotech.gui.enableMenuItem(jsmenubar, 'closePopups', haveOneOpen);
    fotech.gui.enableMenuItem(jsmenubar, 'viewFibreLine', (mainViewType != 'list'));
    fotech.gui.enableMenuItem(jsmenubar, 'showLiveFibre', (mainViewType != 'list'));
    fotech.gui.enableMenuItem(jsmenubar, 'fibreLineProperties', (displayedFibreLineId != null));
    fotech.gui.enableMenuItem(jsmenubar, 'showLatLng', (jsmap != null && $(jsmap.mapId) != null));
}

/* Bind to the VueApp and allow various bits of status control
   to manipulate the menus */

window.addEventListener( 'vueLoaded', function( ev ){
    var app = ev.detail;
    try {
        var popupManage = function( [ type, id ] ){
            let windows = app.$store.getters[ 'panels/panels' ]( { 'type': [ 'Alert', 'RemoteAudio' ] });
            fotech.gui.enableMenuItem(jsmenubar, 'closePopups', (windows && windows.length > 0) );
        }

        app.$store.dispatch( 'actions/subscribe', [ 'panels/show', popupManage ] );
        app.$store.dispatch( 'actions/subscribe', [ 'panels/tear', popupManage ] );
        app.$store.dispatch( 'actions/subscribe', [ 'panels/hide', popupManage ] );
        app.$store.dispatch( 'actions/subscribe', [ 'panels/remove', popupManage ] );

    } catch ( e ){
        console.log( "Unable to bind Vue Popup window listener", e );
    }
});