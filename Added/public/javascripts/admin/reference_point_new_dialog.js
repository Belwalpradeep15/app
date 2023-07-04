/*
 * FILENAME:    reference_point_new_dialog.js
 * AUTHOR:      Karina Simard
 * CREATED ON:  10-09-13
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
 * Dialog used to create a new reference point section location.
 */
admin.ReferencePointNewDialog = function(org_id) {
    var self = this;
    this.organization_id = org_id
    var cfg = {
    xy: [50,50],
    visible: false,
    constraintoviewport: true,
    postmethod: "manual",
    buttons: [
              { text: fotech.gui.labels.dismiss, handler: function() { self.cancel(); } },
              { text: fotech.gui.labels.save, handler: function() { self.save(); } },
              ]
    };
    fotech.gui.ValidatingDialog.call(this, 'reference_point_new_dialog', cfg, 'reference_point_new_form');
    
    this.showEvent.subscribe(this.reset.bind(this));
    
    this.validateFields = function() {
        this.form.getInputs().each( this.genericRequiredValidate, this);

        //validate Lat and Lng
        var lat = this.form['reference_point[latitude]'].value;
        var lon = this.form['reference_point[longitude]'].value;

        var latlon = new LatLon(lat,lon);
        if(!latlon.isValid()){
             if(isNaN(latlon._lat)){
                 this.addValidationFailure('reference_point[latitude]', '','Latitude is invalid');
             }
             if(isNaN(latlon._lon)){
                 this.addValidationFailure('reference_point[longitude]', '', 'Longitude is invalid');
             }
        }
       
    }
}

admin.ReferencePointNewDialog.prototype = new fotech.gui.ValidatingDialog();

/** convenience function to validate required fields */
admin.ReferencePointNewDialog.prototype.genericRequiredValidate = function(input){
    var label = $$('label[for='+input.id+']')[0];
    if(label == null)
        return;
    var label_text = label.innerHTML;
    
    if(input.hasClassName('required'))
        this.validateNotEmpty(input.name, label_text);
}

/**
 * Validate and submit the form.
 */
admin.ReferencePointNewDialog.prototype.save = function() {
    if (this.validate()) {
        this.setBusyState();
        var parameters = Form.serialize(this.form,true);
        var latlon = new LatLon(parameters['reference_point[latitude]'], parameters['reference_point[longitude]']);
        parameters['reference_point[latitude]'] = latlon._lat;
        parameters['reference_point[longitude]'] = latlon._lon;
        new Ajax.Request('/admin/organizations/'+this.organization_id+'/reference_points', 
                         { method: 'post', parameters: parameters });
    }
}

/**
 * Reset the form
 */
admin.ReferencePointNewDialog.prototype.reset = function(){
    this.form.reset();
}
