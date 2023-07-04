/*
 * FILENAME:    fibre_line_dialog.js
 * AUTHOR:      Steven Klassen
 * CREATED ON:  2009-11-07
 * 
 * DESCRIPTION: Javascript related to the fibre line dialog.
 *
 * LAST CHANGE:
 * $Author: sklassen $
 *   $Date: 2011-05-04 19:56:09 -0600 (Wed, 04 May 2011) $
 *    $Rev: 3728 $
 *    $URL: https://repos.fotechsolutions.com/svn/system/panoptes/trunk/modules/panoptes-rails/public/javascripts/admin/fibre_line_dialog.js $
 *
 * COPYRIGHT:
 * This file is Copyright © 2009 Fotech Solutions Ltd. All rights reserved.
 */


/** Admin namespace. */
var admin = (admin ? admin : {}); 



/**
 * Dialog related to creating a new fibre line.
 */
admin.SpliceDialog = function(fibreLineId) {
    var self = this;
    this.fibreLineId = fibreLineId;
    var cfg = {
    visible: false,
    constraintoviewport: true,
    postmethod: "manual",
    y: 40,x:40,
    buttons: [
              { text: fotech.gui.labels.dismiss, handler: function() { self.cancel(); } },
              { text: fotech.gui.labels.submit, handler: function() { self.submit(); } }
              ]
    };
    
    fotech.gui.ValidatingDialog.call(this, 'splice_dialog', cfg, 'splice_form');
    this.validateFields = function() {
        var lineLength = parseFloat($('length_'+this.fibreLineId).innerHTML);
        var prefs = fotech.gui.rootOpener().user.preferences;
        var units = prefs['units-distance'];
        var precision = prefs['precision-distance'];
        var validPosition = this.validateNotEmpty("raw_position", I18n.t('common.headers.position'));
        validPosition = validPosition && this.validateFloat("raw_position", I18n.t('common.headers.position'),0,lineLength);
        if(validPosition){
            var position = parseFloat(this.form.raw_position.value);
            this.form.position.value = fotech.util.convert(position, units, 'm');
            
            var validLength = this.validateNotEmpty("raw_length", I18n.t('admin.common.length'));
            validLength = validLength && this.validateFloat("raw_length", I18n.t('admin.common.length'), position - lineLength);

            if(validLength){
                this.form.length.value = fotech.util.convert(parseFloat(this.form.raw_length.value), units, 'm')
            }
        }
    }
}

admin.SpliceDialog.prototype = new fotech.gui.ValidatingDialog();


/**
 * Validate and submit the form.
 */
admin.SpliceDialog.prototype.submit = function() {
    if (this.validate()) {
        this.setBusyState();
        new Ajax.Request('/admin/fibre_lines/'+this.fibreLineId+'/insert_splice', { method: 'post', parameters: Form.serialize(this.form) });
    }
}
