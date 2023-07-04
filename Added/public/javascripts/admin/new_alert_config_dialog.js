/*
 * FILENAME:    new_alert_config_dialog.js
 * AUTHOR:      Karina Simard
 * CREATED ON:  2009-11-27
 * 
 * DESCRIPTION: Javascript related to the new_alert_config dialog.
 *
 * LAST CHANGE:
 * $Author: sklassen $
 *   $Date: 2011-10-18 15:37:28 -0600 (Tue, 18 Oct 2011) $
 *    $Rev: 4390 $
 *    $URL: https://repos.fotechsolutions.com/svn/system/panoptes/trunk/modules/panoptes-rails/public/javascripts/admin/new_alert_config_dialog.js $
 *
 * COPYRIGHT:
 * This file is Copyright © 2009 Fotech Solutions Ltd. All rights reserved.
 */

/** Admin namespace. */
var admin = (admin ? admin : {}); 
admin.alert_configurations = {};


/**
 * Dialog related to creating a new new_alert_config.
 */
admin.NewAlertConfigDialog = function() {
    var cfg = {
    visible: false,
    constraintoviewport: true,
    xy: [200,200],
    buttons: [
              { text: fotech.gui.labels.dismiss, handler: this.cancel.bind(this) },
              { text: fotech.gui.labels.submit, handler: this.submit.bind(this) }
              ]
    };
    
    fotech.gui.ValidatingDialog.call(this, 'new_alert_config_dialog', cfg, 'new_alert_config_form');
    this.validateFields = function(){
    }
}

admin.NewAlertConfigDialog.prototype = new fotech.gui.ValidatingDialog();

/**
 * Validate and submit the form.
 */
admin.NewAlertConfigDialog.prototype.submit = function() {
    if (this.validate()) {
        this.setBusyState();
        if(confirm(I18n.t('admin.alert_configs.confirm_new'))){
            new Ajax.Request('/admin/alert_configurations', {method:'post',
                              parameters: this.form.serialize(),
                              onSuccess: function(){
                                  window.location.reload();
                              }
            });
        }
        else {
             this.clearBusyState();
        }
    }
}

admin.alert_configurations.heliosupdate = function(form) { new Ajax.Request('/admin/alert_configurations/heliosupdate', { method: 'post', parameters: Form.serialize(form) }); };
