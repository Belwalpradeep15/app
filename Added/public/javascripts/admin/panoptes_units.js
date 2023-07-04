/*
 * FILENAME:    panoptes_units.js
 * AUTHOR:      Steven Klassen
 * CREATED ON:  2009-11-30
 * 
 * DESCRIPTION: Javascript specific to panoptes unit administration.
 *
 * LAST CHANGE:
 * $Author$
 *   $Date$
 *    $Rev$
 *    $URL$
 *
 * COPYRIGHT:
 * This file is Copyright © 2009 Fotech Solutions Ltd. All rights reserved.
 */

/** Admin namespace. */
var admin = (admin ? admin : {});

/** Panoptes units namespace. */
admin.panoptes_units = {};

/** One of the editable fields has been modified. */
admin.panoptes_units.editableFieldChanged = function(el, oldval, newval) {
    if(!/^latlng_/.match(el.id) && (newval == '[removed]' || newval.strip() == '') ){
        el.innerHTML = oldval;
        alert(I18n.t('admin.panoptes_units.invalid_empty_value'));
        return;
    }
    
    if (/^serial_/.match(el.id))     /* Change a serial number. */
        admin.changeField('/admin/panoptes_units', el.attributes['id'].value.substring(7), 'serial_number', newval);
    else if (/^name_/.match(el.id))  /* Change a name. */
        admin.changeField('/admin/panoptes_units', el.attributes['id'].value.substring(5), 'name', newval);
    else if (/^host_/.match(el.id))  /* Change a host name. */
        admin.changeField('/admin/panoptes_units', el.attributes['id'].value.substring(5), 'host_name', newval);
	else if (/^ws_port_/.match(el.id)){  /* Change a port number. */
        newval = newval.gsub(' ','');
        if(/\d+/.match(newval))
            admin.changeField('/admin/panoptes_units', el.attributes['id'].value.substring(8), 'ws_port', newval);
        else {
            el.innerHTML = oldval;
            alert(I18n.t('admin.panoptes_units.invalid_port'));
            return;
        }

    }
    else if (/^latlng_/.match(el.id)){  /* Change a latlng. */
        //preferences
        if(newval == '[removed]'){
        	admin.changeField('/admin/panoptes_units', el.attributes['id'].value.substring(7), 'latlng', '[removed]');
        	el.innerHTML = '';
        	return;
        }
    	
        var prefs = fotech.gui.rootOpener().user.preferences;
        var latlng_units = prefs['units-latlng'];
        var latlng_precision = prefs['precision-latlng'];
        var converted = new LatLon(newval.split(',')[0],newval.split(',')[1]);
        var converted = converted._lat + "," + converted._lon;
        if( /^ *-?\d+(\.\d+)?, *-?\d+(\.\d+)? *$/.match(converted)){
            converted = converted.gsub(' ','');
            admin.changeField('/admin/panoptes_units', el.attributes['id'].value.substring(7), 'latlng', converted);
            el.innerHTML = converted;
        }
        else{
            el.innerHTML = oldval;
            alert(I18n.t('admin.panoptes_units.invalid_lat_lng'));
            return;
        }
    }
}

/** Bring up the dialog for adding a new panoptes unit. */
admin.panoptes_units._panoptes_unit_dialog = null;
admin.panoptes_units.newPanoptesUnit = function() {
    if (!admin.panoptes_units._panoptes_unit_dialog) {
        admin.panoptes_units._panoptes_unit_dialog = new admin.PanoptesUnitDialog();
        admin.panoptes_units._panoptes_unit_dialog.render(document.body);
    }
    admin.panoptes_units._panoptes_unit_dialog.show();
}

/** Bring up the dialog for editing properties of a panoptes unit. */
admin.panoptes_units._panoptes_unit_properties_dialog = null;
admin.panoptes_units.editPanoptesUnitProperties = function(panoptes_id) {
    if(!admin.panoptes_units._panoptes_unit_properties_dialog){
        admin.panoptes_units._panoptes_unit_properties_dialog = new admin.PanoptesUnitPropertiesDialog(panoptes_id);
        admin.panoptes_units._panoptes_unit_properties_dialog.render(document.body);
    }
    else{
        //set the panoptes_id so the submit url gets updated
        admin.panoptes_units._panoptes_unit_properties_dialog.panoptes_unit_id = panoptes_id;
        //need to refresh the form that this dialog is pointing at
        admin.panoptes_units._panoptes_unit_properties_dialog.form = $('panoptes_unit_properties_form');
    }
    admin.panoptes_units._panoptes_unit_properties_dialog.hide();
    admin.panoptes_units._panoptes_unit_properties_dialog.show();
       
}

/** Bring up the dialog for editing multiplexing duty cycles of a panoptes unit. */
admin.panoptes_units.launchStandalone = function(panoptes_id, url){
    var hUnit = fotech.gui.rootOpener().panoptesUnits.get(panoptes_id);
    if(!hUnit)
        admin.panoptes_units.confirmRefresh();
    else if(!hUnit.isAvailable())
        alert(I18n.t('admin.panoptes_units.panoptes_not_available'));
    else
        window.childWindows.registerChild("panoptes_standalone",
                                      window.open(url,I18n.t('admin.panoptes_units.standalone'), "menubar=no,toolbar=no "));

}

admin.panoptes_units.confirmRefresh = function(){
	var simpleDialog = new YAHOO.widget.SimpleDialog("confirm_main_refresh", { 
													  width: "500px", 
													  fixedcenter:true,
													  modal:true,
													  visible:false,
													  draggable:false });
	
	simpleDialog.setHeader(I18n.t('admin.panoptes_units.panoptes_unit_props.changes_made'));
    
    var message = I18n.t('admin.panoptes_units.new_refresh');
	simpleDialog.setBody(message);
	simpleDialog.cfg.setProperty("icon",YAHOO.widget.SimpleDialog.ICON_WARN);
    
    var buttons = []
    buttons.push({ text:I18n.t('admin.panoptes_units.buttons.later'), handler:{fn:simpleDialog.cancel}});
    buttons.push({ text:I18n.t('admin.panoptes_units.buttons.refresh'), handler:{fn:function(){fotech.gui.rootOpener().location.reload();}}});
    
	simpleDialog.cfg.queueProperty("buttons", buttons);
	
	simpleDialog.render(document.body); 
	simpleDialog.show();
    
}
