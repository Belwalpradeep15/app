/*
 * FILENAME:    fibre_break_dialog.js
 * AUTHOR:      Karina Simard
 * CREATED ON:  10-08-30
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
admin.FibreBreakDialog = function(fibre_id) {
    var self = this;
    this.fibre_line_id = fibre_id;
    var cfg = {
    visible: false,
    constraintoviewport: true,
    postmethod: "manual",
    xy: [55,70],
    buttons: [
              { text: fotech.gui.labels.dismiss, handler: function() { self.cancel(); } },
              { text: I18n.t('admin.fibre_lines.clear_break'), handler: function() { self.submit(); } },
              ]
    };
    
    fotech.gui.ValidatingDialog.call(this, 'fibre_break_dialog', cfg, 'fibre_break_form');
    this.showEvent.subscribe(this.refresh.bind(this));
    this.validateFields = function() {
    }
}

admin.FibreBreakDialog.prototype = new fotech.gui.ValidatingDialog();


admin.FibreBreakDialog.prototype.validatePermissions = function(){
    var user = fotech.gui.rootOpener().user;
    return user.permissions["canManageFibreLines"];
}
/**
 * Validate and submit the form.
 */
admin.FibreBreakDialog.prototype.submit = function() {
    if (this.validate()){
        if(!this.validatePermissions()) {
            alert(I18n.t("admin.fibre_lines.fibre_break_dialog.invalid_permissions"));
            return;
        }
        
        this.setBusyState();
        new Ajax.Request("/admin/fibre_lines/"+this.fibre_line_id+"/clear_fibre_break", 
                         {  method: 'put', 
                            parameters: Form.serialize(this.form) });
    }
}

admin.FibreBreakDialog.prototype.refresh = function(){
    this.setBusyState();
    new Ajax.Updater('fibre_break_dialog_body', "/admin/fibre_lines/"+this.fibre_line_id+"/clear_fibre_break",
                     {method : 'get', 
                     evalScripts : true,
                     parameters:{form_only: true},
                     onComplete: function(response){
                        this.setButtonsDisabled();
                        this.clearBusyState();
                        this.form = $('fibre_break_form');
                     }
                     });
}

admin.FibreBreakDialog.prototype.setButtonsDisabled = function(){
    var submitButton = $('fibre_break_dialog').select('div.ft button:last-child')[0];
    submitButton = $(submitButton);
    var permitted_to = fotech.gui.rootOpener().user.permissions["canManageFibreLines"];
    if(permitted_to){
        submitButton.disabled = false;
    } else {
        submitButton.disabled = true;
    }
    return submitButton.disabled;
    
}
