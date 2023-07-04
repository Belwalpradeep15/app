/*
 * COPYRIGHT:
 * This file is Copyright © 2016 Fotech Solutions Ltd. All rights reserved.
 */

 
/** Admin namespace. */
var admin = (admin ? admin : {}); 


/**
 * Dialog used to create a new reference point section location.
 */
admin.MarkerNewDialog = function(org_id) {
    var self = this;
    this.organization_id = org_id
    var cfg = {
    xy: [50,50],
    visible: false,
    close: false, //TODO: Not obvious how to use YUI to have this behave the same as dismiss.
    constraintoviewport: true,
    postmethod: "manual",
    buttons: [
              { text: fotech.gui.labels.dismiss, handler: function() { window.location.reload(true); self.cancel(); } },
              { text: fotech.gui.labels.save, handler: function() { self.save(); } },
              ]
    };
    fotech.gui.ValidatingDialog.call(this, 'marker_new_dialog', cfg, 'marker_new_form');
    
    this.showEvent.subscribe(this.reset.bind(this));
    
    document.observe("marker:moved", function(event) {
        $$("[id*=marker_longitude]")[0].value = event.memo._lon;
        $$("[id*=marker_latitude]")[0].value = event.memo._lat;
    });

    this.validateFields = function() {
        this.form.getInputs().each( this.genericRequiredValidate, this);

        //validate Lat and Lng
        var lat = this.form['marker[latitude]'].value;
        var lon = this.form['marker[longitude]'].value;

        var latlon = new LatLon(lat,lon);
        if(!latlon.isValid()){
             if(isNaN(latlon._lat)){
                 this.addValidationFailure('marker[latitude]', '','Latitude is invalid');
             }
             if(isNaN(latlon._lon)){
                 this.addValidationFailure('marker[longitude]', '', 'Longitude is invalid');
             }
        }

        var marker_type = this.form['marker_types'].value;
        if (marker_type == ""){
        	this.addValidationFailure('marker_types', '', 'Marker type is not specified')
        }
    }
};

admin.MarkerNewDialog.prototype = new fotech.gui.ValidatingDialog();

// TODO:  this is rather preliminary....
admin.MarkerNewDialog.prototype.populateFields = function(id, name, description, latitude, longitude, type) {
    this.form['marker[name]'].value = name || "";
    this.form['marker[description]'].value = description || "";
    this.form['marker[latitude]'].value = latitude || "";
    this.form['marker[longitude]'].value = longitude || "";
    // TODO:  this clearly does not work for a drop-down
    this.form['marker_types'].value = type || "";
    this.marker_id = id;
};

/** convenience function to validate required fields */
admin.MarkerNewDialog.prototype.genericRequiredValidate = function(input){
    var label = $$('label[for='+input.id+']')[0];
    if(label == null)
        return;
    var label_text = label.innerHTML;
    
    if(input.hasClassName('required'))
        this.validateNotEmpty(input.name, label_text);
};

/**
 * Validate and submit the form.
 */
admin.MarkerNewDialog.prototype.save = function() {
    if (this.validate()) {
        this.setBusyState();
        var parameters = Form.serialize(this.form,true);
        var latlon = new LatLon(parameters['marker[latitude]'], parameters['marker[longitude]']);
        parameters['marker[latitude]'] = latlon.lat();
        parameters['marker[longitude]'] = latlon.lon();
        new Ajax.Request('/admin/organizations/'+this.organization_id+'/markers', 
                         { method: 'post', parameters: parameters });
    }
};

/**
 * Reset the form
 */
admin.MarkerNewDialog.prototype.reset = function(){
    this.form.reset();
};