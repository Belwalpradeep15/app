/*
 * COPYRIGHT:
 * This file is Copyright © 2016 Fotech Solutions Ltd. All rights reserved.
 */


/** Admin namespace. */
var admin = (admin ? admin : {});
admin.markers = {};

//TODO: Figure out why I need to copy this function to here and why it's not accessible via the admin namespace
admin.changeField = function(url, id, field, newval, options) {
    options = options || {};
    var form = $('update_form');
    form.field.value = field;
    form.value.value = newval;
    disableRow("row_" + id);
    var submit_url = url + '/' + id;
    if(options.urlSuffix)
        submit_url += "/"+options.urlSuffix;
    var ajaxOptions = options.ajaxOptions || {};
    new Ajax.Request(
                        submit_url,
                        $H({
                            method: 'put',
                            parameters: Form.serialize(form)
                        }).merge(ajaxOptions).toObject());
};


admin.markers.change_lat_lon_field = function(id, location, organization_id)
{
	var prefs = fotech.gui.rootOpener().user.preferences;
	var latlng_units = prefs['units-latlng'];
	var latlng_precision = prefs['precision-latlng'];
	var converted = new LatLon( location.lat(), location.lon());
	var converted = converted._lat + "," + converted._lon;
	converted = converted.gsub(' ','');
    admin.changeField('/admin/organizations/'+ organization_id +'/markers', id, 'latlng', converted,
                        {
                            ajaxOptions: {
                                onSuccess: function(){
                                    if ( window.opener ){
                                        FotechCore.dispatchEvent( window.opener, 'fotech:map.marker.saved', {
                                            id: id,
                                            location: location,
                                            organization_id: organization_id,
                                            converted: converted
                                        });
                                    }
                                }
                            }
                        });
};

// An editable field has changed. We reroute based on what element caused this to occur.
admin.markers.editableFieldChanged = function(el, oldval, newval) {
    newval = newval == '[removed]' ? '' : newval.strip();
    if(newval == ''){
        el.innerHTML = oldval;
        alert(I18n.t('admin.invalid_empty_value'));
        return;
    }

    var id = el.attributes['id'];
    var org_id = id.value.match(/\d+/g)[0];
    var marker_id = id.value.match(/\d+/g)[1];
    if (id.value.match(/^description_\d+_\d+/))
		admin.changeField('/admin/organizations/'+org_id+'/markers', marker_id, 'description', newval);
    if (id.value.match(/^name_\d+_\d+/))
		admin.changeField('/admin/organizations/'+org_id+'/markers', marker_id, 'name', newval);
    if (id.value.match(/^latlng_\d+_\d+/)){
        var prefs = fotech.gui.rootOpener().user.preferences;
        var latlng_units = prefs['units-latlng'];
        var latlng_precision = prefs['precision-latlng'];
        var converted = new LatLon(newval.split(',')[0],newval.split(',')[1]);
        var converted = converted._lat + "," + converted._lon;
        if(/^ *-?\d+(\.\d+)?, *-?\d+(\.\d+)? *$/.match(converted)){
            converted = converted.gsub(' ','');
            admin.changeField('/admin/organizations/'+org_id+'/markers', marker_id, 'latlng', converted);
            el.innerHTML = newval;
        }
        else{
            el.innerHTML = oldval;
            alert(I18n.t('admin.helios_units.invalid_lat_lng'));
            return;
        }
    }
};

/** Bring up the dialog for adding a new marker. */
admin.markers._marker_dialog = null;
admin.markers.newMarker = function(org_id) {
    if (!admin.markers._marker_dialog) {
        admin.markers._marker_dialog = new admin.MarkerNewDialog(org_id);
        admin.markers._marker_dialog.render(document.body);
    }
    admin.markers._marker_dialog.show();
};

/** Open the map calibration window. */
admin.markers.openMapCalibration = function(org_id) {
    childWindows.registerChild("calibration",
                               window.open("/admin/markers/" + org_id + "/map_calibrate", "Calibration", "menubar=no,toolbar=no"));
};


