/*
 * FILENAME:    helios.js
 * AUTHOR:      Steven Klassen
 * CREATED ON:  2010-01-11
 *
 * DESCRIPTION: Javascript specific to the helios boxes in monitor.
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

/** Helios namespace. */
monitor.helios = (monitor.helios ? monitor.helios : {});

/** Helios namespace. */
monitor.helios.laser = (monitor.helios.laser ? monitor.helios.laser : {});

HeliosUnit = function(id, status, laserStatus){
	this.id = id;
	this.status = status;
	this.laser_status = laserStatus;
}

HeliosUnit.prototype.isAvailable = function(){
    return !/[Nn]o.connection/.test(this.status) && !/[Ii]nactive/.test(this.status);
}

monitor.helios.recheckStatus = function() {
    if ($('helios_status_form'))
        new Ajax.Request('/monitor/helioscontrol/status', { method: 'post', parameters: Form.serialize($('helios_status_form')) });
    return true;
}


/** Obtain all the Helios' Status. */
monitor.helios.request = function() {
	if (monitor.helios.statusDialog) {
        var item = fotech.gui.getMenuItemById(jsmenubar, "showHeliosStatus");
        if (item.cfg.getProperty("checked")){
    	    monitor.helios.recheckStatus();
        }
    }
}


monitor.helios.getHeliosStatus = function(heliosUnitId){
	new Ajax.Request('/monitor/helioscontrol/status', {	method: 'get',
					 asynchronous:true, evalScripts:true,
					 parameters:'helios_unit_ids='+heliosUnitId});
	return true;
}

/** Dialog for showing the helios status. */
monitor.helios.statusDialog = null;

monitor.helios.toggleHeliosStatusDialog = function() {
    if (monitor.helios.statusDialog) {
        var item = fotech.gui.getMenuItemById(jsmenubar, "showHeliosStatus");
        if (item.cfg.getProperty("checked"))
            monitor.helios.statusDialog.show();
        else
            monitor.helios.statusDialog.hide();
    }
}

monitor.helios.setupStatusDialog = function() {
    if (!monitor.helios.statusDialog) {
        var panel = new YAHOO.widget.Panel('helios_status', { visible: false, constraintoviewport: true });
        panel.render(document.body);
        if(typeof overlayManager != 'undefined')
            overlayManager.register(panel);
        panel.hideEvent.subscribe(function() {
                        fotech.gui.getMenuItemById(jsmenubar, "showHeliosStatus").cfg.setProperty('checked', false);
                                });
        panel.moveTo(document.viewport.getWidth() - panel.element.offsetWidth - 5, 85);
        monitor.helios.statusDialog = panel;
        fotech.gui.enableMenuItem(jsmenubar, 'showHeliosStatus', true);
        Event.observe(window, 'resize', function(){fotech.gui.moveBackIntoWindow(monitor.helios.statusDialog);});
    }
}

/** Show the status for a given helios unit. */
monitor.helios.setStatus = function(heliosUnitId, status) {
	var hUnits = fotech.gui.rootOpener().heliosUnits;
    var unit = hUnits.get(heliosUnitId);
	unit = typeof(unit) == 'undefined' || unit == null ? new HeliosUnit(heliosUnitId, status) : unit;
	unit.status = status;
	hUnits.set(heliosUnitId, unit);

    monitor.helios.updateStatusDisplay(heliosUnitId, status);

    Event.fire(fotech.gui.rootOpener(), 'fotech:status', {id:heliosUnitId, status:status});
}

monitor.helios.updateStatusDisplay = function(heliosUnitId, status){
    var statStr = I18n.t('model.helios_unit.status.' + status);
	var el = $('helios_status_' + heliosUnitId);
    if (el)
        el.innerHTML = statStr;
    el = $('helios_status_1_' + heliosUnitId);
    if (el)
        el.innerHTML = statStr;

    var isRunning = (status == "running");
    var isAvailable = (status != "no_connection" && status != "inactive");
    monitor.helios._enable($('helios_start_' + heliosUnitId), !isRunning && isAvailable, function() { monitor.helios._submit(heliosUnitId, 'start'); });
    monitor.helios._enable($('helios_stop_' + heliosUnitId), isRunning && isAvailable, function() { monitor.helios._submit(heliosUnitId, 'stop'); });
    monitor.helios._enable($('duty_cycle_' + heliosUnitId), isAvailable);
    monitor.helios._enable($('helios_standalone_' + heliosUnitId), isAvailable);
    enableRow('helios_row_' + heliosUnitId);

    el = $('submit_to_helios_button');
    if(el){
        el.disabled = !isAvailable;
        el.value = I18n.t('admin.configuration.submit_to_helios', { status: statStr });
    }
}

/** Enable a button in the helios dialog. */
monitor.helios._enable = function(el, shouldEnable) {
    if (el) {
        if (shouldEnable) {
            el.removeClassName('disabled');
        }
        else {
            el.addClassName('disabled');
        }
    }
}

/** Send a message. */
monitor.helios.submitIfEnabled = function(control, heliosUnitId, command) {
    if (!control.hasClassName('disabled')) {
        disableRow('helios_row_' + heliosUnitId);
        new Ajax.Request('/monitor/helioscontrol/' + heliosUnitId + '/' + command, { method: 'get' });
    }
}

/**-----------------------------Laser------------------*/

/** Send a message. */
monitor.helios.laser.submitIfEnabled = function(control, heliosUnitId, command) {
    if (!control.hasClassName('disabled')) {
        disableRow('laser_row_' + heliosUnitId);
        new Ajax.Request('/monitor/helioscontrol/' + heliosUnitId + '/' + command + '_laser', { method: 'get' });
    }
}

/** Show the status for a given helios unit. */
monitor.helios.laser.setStatus = function(heliosUnitId, laserStatus) {
	var hUnits = fotech.gui.rootOpener().heliosUnits
    var unit = hUnits.get(heliosUnitId);
    unit = (unit == null) ? new HeliosUnit(heliosUnitId, null, laserStatus) : unit;
	unit.laser_status = laserStatus;
	hUnits.set(heliosUnitId, unit);

    monitor.helios.laser.updateStatusDisplay(heliosUnitId, laserStatus);
    Event.fire(fotech.gui.rootOpener(), 'fotech:laserStatus', {id:heliosUnitId, status:laserStatus});
}

monitor.helios.laser.updateStatusDisplay = function(heliosUnitId, laserStatus){
    var el = $('laser_status_' + heliosUnitId);
    if (el)
        el.innerHTML = I18n.t('model.helios_unit.status.' + laserStatus);

    var isOn = (laserStatus == "laser_on");
    var isOff = (laserStatus == "laser_off" || laserStatus == "locked_out");
    monitor.helios._enable($('laser_start_' + heliosUnitId), isOff);
    monitor.helios._enable($('laser_stop_' + heliosUnitId), isOn);
    enableRow('laser_row_' + heliosUnitId);
}

/** gets laser status for particular helios id
 *  but will avoid making an ajax call if the helios unit is marked as "not connected"
 *  will also not bother if the page itself is not interested in laser status (i.e. the element to be updated
 *  does not exist on this page)
 */
monitor.helios.laser.getLaserStatus = function(heliosUnitId){
	// don't bother checking laser status if the helious unit is not connected
	var heliosUnit = fotech.gui.rootOpener().heliosUnits.get(heliosUnitId);

	if ($('laser_status_' + heliosUnitId) == null)
		return; //this page isn't concerned with laser status so don't do anything
	else if (typeof(heliosUnit) == 'undefined' || heliosUnit == null )
		monitor.helios.laser.setStatus(heliosUnitId, 'Helios Unit not Found');
	else if( heliosUnit.status == 'no_connection')
		monitor.helios.laser.setStatus(heliosUnit.id, heliosUnit.status);
	else {
		new Ajax.Request('/monitor/helioscontrol/laser_status', {	method: 'get',
						 asynchronous:true, evalScripts:true,
						 parameters:'helios_unit_ids=' + heliosUnitId});
	}
}

