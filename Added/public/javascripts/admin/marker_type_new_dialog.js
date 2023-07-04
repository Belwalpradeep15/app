/*
 * COPYRIGHT:
 * This file is Copyright © 2016 Fotech Solutions Ltd. All rights reserved.
 */

 
/** Admin namespace. */
var admin = (admin ? admin : {}); 


function check_for_type_file_upload() {
    var file_type = $('upload_file_type');

  }


admin.MarkerTypeNewDialog = function() {
    var self = this;
    var cfg = {
    xy: [50,50],
    visible: true,
    constraintoviewport: true,
    postmethod: "manual",
    buttons: [
              { text: I18n.t('common.button.dismiss'), handler: function() { self.cancel(); } },
              { text: I18n.t('common.button.save'), handler: function() { self.save(); } },
          ]
    };
    fotech.gui.ValidatingDialog.call(this, 'marker_type_new_dialog', cfg, 'marker_type_new_form');
    
    this.showEvent.subscribe(this.reset.bind(this));
    
    this.validateFields = function() {
        this.form.getInputs().each( this.genericRequiredValidate, this);
    }
}

admin.MarkerTypeNewDialog.prototype = new fotech.gui.ValidatingDialog();

/** convenience function to validate required fields */
admin.MarkerTypeNewDialog.prototype.genericRequiredValidate = function(input){
    var label = $$('label[for='+input.id+']')[0];
    if(label == null)
        return;
    var label_text = label.innerHTML;
    
    if(input.hasClassName('required'))
        this.validateNotEmpty(input.name, label_text);
}

admin.MarkerTypeNewDialog.updateFilename = function(){
    $('et_upload_filename').update($('upload_file_type').files[0].name);
  };

/**
 * Validate and submit the form.
 */
admin.MarkerTypeNewDialog.prototype.save = function() {
    if (this.validate()) {
    	this.setBusyState();
        var reader = new FileReader();
        var marker_type_name = $('marker_type_name').value;
        var authenticity_token = $('authenticity_token').value;
        var file = $('upload_file_type').files[0];
        var msg = "";

        reader.onload = function(event) {
            new Ajax.Request('/admin/marker_types', {
                method: 'post',
                parameters: {marker_type_name: marker_type_name, data: event.target.result, authenticity_token: authenticity_token, filename: file.name},
                evalScripts:true
            });
        };
        
        if (file) {
        	reader.readAsDataURL(file);
        }else{
        	alert($('upload_file_type').readAttribute('file_type_error'));
        	this.clearBusyState();
        }
    }
};
/**
 * Reset the form
 */
admin.MarkerTypeNewDialog.prototype.reset = function(){
    this.form.reset();
};