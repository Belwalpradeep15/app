/*
 * FILENAME:    helios_units.js
 * AUTHOR:      Steven Klassen
 * CREATED ON:  2009-11-30
 * 
 * DESCRIPTION: Javascript specific to helios unit administration.
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

/** Helios units namespace. */
admin.helios_units = {};

/** One of the editable fields has been modified. */
admin.helios_units.editableFieldChanged = function(el, oldval, newval) {
    if(!/^latlng_/.match(el.id) && (newval == '[removed]' || newval.strip() == '') ){
        el.innerHTML = oldval;
        alert(I18n.t('admin.helios_units.invalid_empty_value'));
        return;
    }
    
    if (/^serial_/.match(el.id))     /* Change a serial number. */
        admin.changeField('/admin/helios_units', el.attributes['id'].value.substring(7), 'serial_number', newval);
    else if (/^name_/.match(el.id))  /* Change a name. */
        admin.changeField('/admin/helios_units', el.attributes['id'].value.substring(5), 'name', newval);
    else if (/^host_/.match(el.id))  /* Change a host name. */
        admin.changeField('/admin/helios_units', el.attributes['id'].value.substring(5), 'host_name', newval);
    else if (/^port_/.match(el.id)){  /* Change a port number. */
        newval = newval.gsub(' ','');
        if(/\d+/.match(newval))
            admin.changeField('/admin/helios_units', el.attributes['id'].value.substring(5), 'port', newval);
        else {
            el.innerHTML = oldval;
            alert(I18n.t('admin.helios_units.invalid_port'));
            return;
        }
    } else if (/^ws_port_/.match(el.id)){  /* Change a port number. */
        newval = newval.gsub(' ','');
        if(/\d+/.match(newval))
            admin.changeField('/admin/helios_units', el.attributes['id'].value.substring(8), 'ws_port', newval);
        else {
            el.innerHTML = oldval;
            alert(I18n.t('admin.helios_units.invalid_port'));
            return;
        }

    }
    else if (/^chcount_/.match(el.id)) { /* Change the number of MUX channels. */
        newval = newval.gsub(' ','');
        if(/\d+/.match(newval)) {
            if (parseInt(newval) <= 0) {
                // TODO: need to make this error a valid I18n call.
                el.innerHTML = oldval;
                alert("The multiplex channel count must be an integer greater than 0.");
                return;
            }
            admin.changeField('/admin/helios_units', el.attributes['id'].value.substring(8), 'channel_count', newval);
        }
        else {
            // TODO: need to make this error a valid I18n call.
            el.innerHTML = oldval;
            alert("The multiplex channel count must be an integer greater than 0.");
            return;
        }
    }
    else if (/^latlng_/.match(el.id)){  /* Change a latlng. */
        //preferences
        if(newval == '[removed]'){
        	admin.changeField('/admin/helios_units', el.attributes['id'].value.substring(7), 'latlng', '[removed]');
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
            admin.changeField('/admin/helios_units', el.attributes['id'].value.substring(7), 'latlng', converted);
            el.innerHTML = converted;
        }
        else{
            el.innerHTML = oldval;
            alert(I18n.t('admin.helios_units.invalid_lat_lng'));
            return;
        }
    }
};

/** Bring up the dialog for adding a new helios unit. */
admin.helios_units._helios_unit_dialog = null;
admin.helios_units.newHeliosUnit = function() {
    if (!admin.helios_units._helios_unit_dialog) {
        admin.helios_units._helios_unit_dialog = new admin.HeliosUnitDialog();
        admin.helios_units._helios_unit_dialog.render(document.body);
    }
    admin.helios_units._helios_unit_dialog.show();
};

/** Bring up the dialog for editing properties of a helios unit. */
admin.helios_units._helios_unit_section_location_dialog = null;
admin.helios_units.editHeliosUnitSectionLocation = function(helios_id) {
	new Ajax.Updater("helios_unit_section_location_dialog_body",
                      "/admin/helios_units/" + helios_id + "/edit_section_location", { method: 'get', onComplete: function(transport) {
        		admin.helios_units._helios_unit_section_location_dialog = new admin.HeliosUnitSectionLocationDialog(helios_id);
        		admin.helios_units._helios_unit_section_location_dialog.render(document.body);
        		admin.helios_units._helios_unit_section_location_dialog.show();
			}
		});
};

admin.helios_units.openPropertiesSync = function(control,helios_id){
    var hUnit = fotech.gui.rootOpener().heliosUnits.get(helios_id);
    if(!hUnit)
        admin.helios_units.confirmRefresh();
    else if(!hUnit.isAvailable())
        alert(I18n.t('admin.helios_units.helios_not_available'));
    else
        window.childWindows.registerChild("helios_properties_sync", 
                                      window.open("/admin/helios_units/" + helios_id + "/sync_from_helios", I18n.t('admin.helios_units.sync_from_helios.'), "menubar=no,toolbar=no" ));
};

admin.helios_units.launchStandalone = function(helios_id, url){
    var hUnit = fotech.gui.rootOpener().heliosUnits.get(helios_id);
    if(!hUnit)
        admin.helios_units.confirmRefresh();
    else if(!hUnit.isAvailable())
        alert(I18n.t('admin.helios_units.helios_not_available'));
    else
        window.childWindows.registerChild("helios_standalone",
                                      window.open(url,I18n.t('admin.helios_units.standalone'), "menubar=no,toolbar=no,noopener"));

};

admin.helios_units.confirmRefresh = function(){
	var simpleDialog = new YAHOO.widget.SimpleDialog("confirm_main_refresh", { 
													  width: "500px", 
													  fixedcenter:true,
													  modal:true,
													  visible:false,
													  draggable:false });
	
	simpleDialog.setHeader(I18n.t('admin.helios_units.helios_unit_props.changes_made'));
    
    var message = I18n.t('admin.helios_units.new_refresh');
	simpleDialog.setBody(message);
	simpleDialog.cfg.setProperty("icon",YAHOO.widget.SimpleDialog.ICON_WARN);
    
    var buttons = []
    buttons.push({ text:I18n.t('admin.helios_units.buttons.later'), handler:{fn:simpleDialog.cancel}});
    buttons.push({ text:I18n.t('admin.helios_units.buttons.refresh'), handler:{fn:function(){fotech.gui.rootOpener().location.reload();}}});
    
	simpleDialog.cfg.queueProperty("buttons", buttons);
	
	simpleDialog.render(document.body); 
	simpleDialog.show();
    
};
