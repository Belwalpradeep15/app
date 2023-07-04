/*
 * FILENAME:    new_template_dialog.js
 * AUTHOR:      Karina Simard
 * CREATED ON:  10-08-20
 * 
 * DESCRIPTION:  
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

/**
 * @fileoverview ...add brief description of the file...
 */
 
/** Admin namespace. */
var admin = (admin ? admin : {}); 


/**
 * Dialog used to create a new helios unit.
 */
admin.TemplateNewDialog = function() {
    var self = this;
    var cfg = {
    visible: false,
    constraintoviewport: true,
    postmethod: "manual",
    xy: [50,70],
    buttons: [
              { text: fotech.gui.labels.dismiss, handler: function() { self.cancel(); } },
              { text: fotech.gui.labels.submit, handler: function() { self.submit(); } }
              ]
    };
    fotech.gui.ValidatingDialog.call(this, 'template_new_dialog', cfg, 'template_new_form');
    
    this.showEvent.subscribe(self.form.reset);
    
    this.validateFields = function() {
        this.validateNotEmpty('template_name', I18n.t('admin.configuration.template_new_dialog.name'));
    }
}

admin.TemplateNewDialog.prototype = new fotech.gui.ValidatingDialog();

/**
 * Validate and submit the form.
 */
admin.TemplateNewDialog.prototype.submit = function() {
    if (this.validate()) {
        this.setBusyState();
        var self = this;
        var name = $('template_name').value;
        var template_id = $('template_id').value;
        childWindows.registerChild("editTemplate", 
                                   window.open("/admin/configuration/template_new?name="+name+"&copy_template_id="+template_id, 
                                               I18n.t('admin.configuration.template.edit_template'), "menubar=no,toolbar=no"));
        this.clearBusyState();
        this.hide();
    }
}
