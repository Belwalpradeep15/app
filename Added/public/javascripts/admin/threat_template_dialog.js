/*
 * FILENAME:    threat_template_dialog.js
 * AUTHOR:      Karina Simard
 * CREATED ON:  2009-11-27
 * 
 * DESCRIPTION: Javascript related to the threat_template dialog.
 *
 * LAST CHANGE:
 * $Author: sklassen $
 *   $Date: 2011-10-18 15:37:28 -0600 (Tue, 18 Oct 2011) $
 *    $Rev: 4390 $
 *    $URL: https://repos.fotechsolutions.com/svn/system/panoptes/trunk/modules/panoptes-rails/public/javascripts/admin/threat_template_dialog.js $
 *
 * COPYRIGHT:
 * This file is Copyright © 2009 Fotech Solutions Ltd. All rights reserved.
 */

/** Admin namespace. */
var admin = (admin ? admin : {}); 

/**
 * Dialog related to creating a new threat_template.
 */
admin.ThreatTemplateDialog = function() {
    var cfg = {
    visible: false,
    constraintoviewport: true,
    xy: [200,200],
    buttons: [
              { text: fotech.gui.labels.dismiss, handler: this.cancel.bind(this) },
              { text: fotech.gui.labels.submit, handler: this.submit.bind(this) }
              ]
    };
    
    fotech.gui.ValidatingDialog.call(this, 'threat_template_dialog', cfg, 'threat_template_form');
    this.validateFields = function(){};
}

admin.ThreatTemplateDialog.prototype = new fotech.gui.ValidatingDialog();

admin.ThreatTemplateDialog.prototype.show_for = function(alert_name){
    this.alert_name = alert_name;
    this.show();
}

admin.ThreatTemplateDialog.prototype.applyTemplateTo = function(alert_name){
    var form = $('alert_configs_form');
    var units = fotech.gui.rootOpener().user.preferences['units-distance'];
    var precision = fotech.gui.rootOpener().user.preferences['precision-distance'];
 
    var threatTemplate = $H(threat_config_templates[this.form['template_name'].value]);
    form[alert_name + '[threat_configuration][counting_width]'].value = threatTemplate.get('counting_width');
    form['raw_'+alert_name+'[threat_configuration][counting_width]'].value = fotech.util.convert(threatTemplate.get('counting_width'), 'm',units, precision);

    form[alert_name + '[threat_configuration][decrement_value]'].value = threatTemplate.get('decrement_value');

    var threat_thresholds = $H(threatTemplate.get('threat_threshold'));
    var prefix = alert_name + '[threat_threshold]';
    threat_thresholds.each(function(a){
        var key = a.key, attrs = a.value;
        $H(attrs).each(function(b){
            var attr = b.key, value = b.value;
            form[prefix + '['+key+']['+attr+']'].value = value;
        });
    });

    var threat_increments = $H(threatTemplate.get('threat_increment'));
    prefix = alert_name + '[threat_increment]';
    threat_increments.each(function(a){
        var key = a.key, attrs = a.value;
        $H(attrs).each(function(b){
            var attr = b.key, value = b.value;
            form[prefix + '['+key+']['+attr+']'].value = value;
        });
    });
    
}

/**
 * Validate and submit the form.
 */
admin.ThreatTemplateDialog.prototype.submit = function() {
    if (this.validate()) {
        this.setBusyState();
        this.applyTemplateTo(this.alert_name)
        this.clearBusyState();
        this.hide();
    }
}

