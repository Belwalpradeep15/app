/*
 * FILENAME:    fibre_lines.js
 * AUTHOR:      Steven Klassen
 * CREATED ON:  2009-11-05
 * 
 * DESCRIPTION: Javascript specific to fibre lines administration.
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

/** Fibre lines namespace. */
admin.fibre_lines = {};

/** Enable the menu items. */
admin.fibre_lines.enableMenus = function() {
}

/** Open the map calibration window. */
admin.fibre_lines.openMapCalibration = function(fibreLineId) {
    childWindows.registerChild("calibration", 
                               window.open("/admin/fibre_lines/" + fibreLineId + "/map_calibrate", "Calibration", "menubar=no,toolbar=no"));
}

/** Open the section calibration window. */
admin.fibre_lines.openSectionCalibration = function(fibreLineId) {
    childWindows.registerChild("calibration", 
                               window.open("/admin/fibre_lines/" + fibreLineId + "/section_calibrate", "Calibration", "menubar=no,toolbar=no"));
}

/** Open the section calibration window. */
admin.fibre_lines.openFibreRegionEdit = function(fibreLineId) {
    childWindows.registerChild("calibration", 
                               window.open("/admin/fibre_lines/" + fibreLineId + "/fibre_regions", "Fibre Region", "menubar=no,toolbar=no"));
}

/** Open the section calibration window. */
admin.fibre_lines.openManualCalibrationEntry = function(fibreLineId) {
    childWindows.registerChild("calibration", 
                               window.open("/admin/fibre_lines/" + fibreLineId + "/manual_calibration", "Manual Calibration", "menubar=no,toolbar=no"));
}

/** Open the suppression window. */
admin.fibre_lines.openSuppressionAdmin = function(fibreLineId) {
    childWindows.registerChild("calibration", 
                               window.open("/admin/fibre_lines/" + fibreLineId + "/suppression", "Suppression", "menubar=no,toolbar=no"));
}

/** Open the configuration edit window. */
admin.fibre_lines.openConfigurationEdit = function(fibreLineId, configurationId) {
    childWindows.registerChild("calibration", 
                               window.open("/admin/configuration/"+configurationId+"/edit", "Fibre Line Configuration", "menubar=no,toolbar=no"));
}

/** One of the editable fields has been modified. */
admin.fibre_lines.editableFieldChanged = function(el, oldval, newval) {
    newval = newval == '[removed]' ? '' : newval.strip();
    if(newval == ''){
        el.innerHTML = oldval;
        alert(I18n.t('admin.invalid_empty_value'));
        return;    
    }
    var prefs = fotech.gui.rootOpener().user.preferences;
    
    if (el.attributes['id'].value.substring(0, 5) == "name_")           /* Rename a fibre. */
        admin.changeField('/admin/fibre_lines', el.attributes['id'].value.substring(5), 'name', newval);
    if (el.attributes['id'].value.startsWith("zero_point_")){           /* set zero point. */
        if(/^((\d+(\.\d*)?)|\.\d+)([eE][+-]?[0-9]+)?$/.test(newval) == false){
            el.innerHTML = oldval;
            alert(I18n.t('admin.invalid_float_value'));
            return;
        }
        newval = parseFloat(newval);
        newval = fotech.util.convert(newval, prefs['units-distance'], 'm');
        admin.changeField('/admin/fibre_lines', el.attributes['id'].value.substring(11), 'zero_point', newval);
    }
    if (el.attributes['id'].value.startsWith("length_")){           /* set length. */
        if(/^((\d+(\.\d*)?)|\.\d+)([eE][+-]?[0-9]+)?$/.test(newval) == false){
            el.innerHTML = oldval;
            alert(I18n.t('admin.invalid_float_value'));
            return;
        }
        newval = parseFloat(newval);
        newval = fotech.util.convert(newval, prefs['units-distance'], 'm');
        admin.changeField('/admin/fibre_lines', el.attributes['id'].value.substring(7), 'length', newval);
    }
}

/** Bring up the dialog for adding a new fibre line. */
admin.fibre_lines._fibre_line_dialog = null;
admin.fibre_lines.newFibreLine = function() {
    if (!admin.fibre_lines._fibre_line_dialog) {
        admin.fibre_lines._fibre_line_dialog = new admin.newFibreLineDialog();
        admin.fibre_lines._fibre_line_dialog.render(document.body);
    }
    admin.fibre_lines._fibre_line_dialog.show();
}
/** Bring up the dialog for adding a new fibre line. */
admin.fibre_lines._fibre_break_dialog = null;
admin.fibre_lines.showFibreBreak = function(fibre_id) {
    if (!admin.fibre_lines._fibre_break_dialog) {
        admin.fibre_lines._fibre_break_dialog = new admin.FibreBreakDialog(fibre_id);
        admin.fibre_lines._fibre_break_dialog.render(document.body);
    }
    admin.fibre_lines._fibre_break_dialog.fibre_line_id = fibre_id;
    admin.fibre_lines._fibre_break_dialog.show();
}


admin.fibre_lines._splice_dialog = null;
admin.fibre_lines.openInsertSplice = function(fibre_id){
    if (!admin.fibre_lines._splice_dialog){
        admin.fibre_lines._splice_dialog = new admin.SpliceDialog(fibre_id);
        admin.fibre_lines._splice_dialog.render(document.body);
    }
    admin.fibre_lines._splice_dialog.fibre_line_id = fibre_id;
    admin.fibre_lines._splice_dialog.show();
}
