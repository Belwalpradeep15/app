/*
 * FILENAME:    event_tracking_dialog.js
 * AUTHOR:      Steven Klassen
 * CREATED ON:  2010-05-12
 * 
 * DESCRIPTION: Javascript related to the event tracking configuration dialog.
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

/** Dialog used to create a new event tracking rule. */
admin.EventTrackingDialog = function() {
    var self = this;
    var cfg = {
    visible: false,
    constraintoviewport: true,
    postmethod: "manual",
    buttons: [
              { text: fotech.gui.labels.dismiss, handler: function() { self.cancel(); } },
              { text: fotech.gui.labels.submit, handler: function() { self.submit(); } }
              ]
    };
    
    fotech.gui.ValidatingDialog.call(this, 'event_tracking_dialog', cfg, 'event_tracking_form');
    this.validateFields = function() {
        this.validateNotEmpty("name", I18n.t('admin.configuration.event_tracking.new_dialog.name'));
        this.validateNotEmpty("event_type", I18n.t('admin.configuration.event_tracking.new_dialog.type'));
        this.validateChecked("fibre_lines_", I18n.t('admin.configuration.event_tracking.new_dialog.lines'), 1);
        this.validateNotEmpty("time_difference", I18n.t('admin.configuration.event_tracking.new_dialog.time_diff'));
        this.validateFloat("time_difference", I18n.t('admin.configuration.event_tracking.new_dialog.time_diff'), 0);
        this.validateNotEmpty("distance_difference", I18n.t('admin.configuration.event_tracking.new_dialog.dist_diff'));
        this.validateFloat("distance_difference", I18n.t('admin.configuration.event_tracking.new_dialog.dist_diff'), 0);
    }
}

admin.EventTrackingDialog.prototype = new fotech.gui.ValidatingDialog();

/** Validate and submit the form. */
admin.EventTrackingDialog.prototype.submit = function() {
    if (this.validate()) {
        var prefs = fotech.gui.rootOpener().user.preferences;
        this.form.distance_difference.value = new String(fotech.util.convert(parseFloat(this.form.distance_difference.value), prefs['units-distance'], 'm'));
        this.setBusyState();
        if (this.form.config_id.value != "")
            new Ajax.Request('/admin/event_tracking_configs/' + this.form.config_id.value, 
                             { method: 'put', parameters: Form.serialize(this.form) });
        else
            new Ajax.Request('/admin/event_tracking_configs', { method: 'post', parameters: Form.serialize(this.form) });
    }
}

/** Clear the form. */
admin.EventTrackingDialog.prototype.clear = function() {
    this.form.config_id.value = "";
    this.form.name.value = "";
    this.form.event_type.selectedIndex = 0;
    this.form.checkAll("fibre_lines[]", false); 
    this.form.time_difference.value = "";
    this.form.distance_difference.value = "";
    this.form.is_active.value = "1";
}
