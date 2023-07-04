/*
 * FILENAME:    helios_unit_section_location_dialog.js
 * AUTHOR:      Karina Simard
 * CREATED ON:  10-09-10
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
admin.HeliosUnitSectionLocationDialog = function(id) {
    var self = this;
    this.helios_unit_id = id
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
    fotech.gui.ValidatingDialog.call(this, 'helios_unit_section_location_dialog', cfg, 'helios_unit_section_location_form');
    
    this.showEvent.subscribe(this.showSaveButton.bind(this));
    
    this.validateFields = function() {
    }
}

admin.HeliosUnitSectionLocationDialog.prototype = new fotech.gui.ValidatingDialog();

/**
 * Validate and submit the form.
 */
admin.HeliosUnitSectionLocationDialog.prototype.save = function() {
    if (this.validate()) {
        this.setBusyState();
        new Ajax.Request('/admin/helios_units/'+this.helios_unit_id+'/edit_section_location', { method: 'put', parameters: Form.serialize(this.form) });
    }
}

admin.HeliosUnitSectionLocationDialog.prototype.showSaveButton = function(){
    var submitButton = $('helios_unit_section_location_dialog').select('div.ft button:last-child')[0];
    submitButton.disabled = $('helios_unit_section_location_form') == null;
}

admin.HeliosUnitSectionLocationDialog.imageClicked = function(document_id, event){
    event.addOffsetXY();
    var section_diagram = $('diagram_image_'+document_id);
    $('x_offset_'+document_id).value = event.offsetX / section_diagram.width;
    $('y_offset_'+document_id).value = ( section_diagram.height - event.offsetY ) / section_diagram.height;
    var helios_icon = $('helios_icon_'+document_id);
    helios_icon.show();
    helios_icon.style.left = (event.offsetX - helios_icon.width/2) + "px";
    helios_icon.style.top = (event.offsetY - helios_icon.height/2) + "px";    
    helios_icon.style.position = 'absolute';

}

admin.HeliosUnitSectionLocationDialog.imageOnload = function(document_id, x_offset, y_offset){
    admin.HeliosUnitSectionLocationDialog.scaleImage(document_id, 500,500);
    var section_diagram = $('diagram_image_' + document_id);
    var helios_icon = $('helios_icon_' + document_id);
    var diagram_width = section_diagram.width;
    var diagram_height = section_diagram.height;
    helios_icon.style.left = ((diagram_width * x_offset) - helios_icon.width/2) + "px";
    helios_icon.style.top = ( diagram_height - ((diagram_height * y_offset) - helios_icon.height/2)) + "px";
    if(x_offset == null || y_offset == null)
        helios_icon.hide();
    else
        helios_icon.show();
}

admin.HeliosUnitSectionLocationDialog.switchDiagram = function(select){
    var document_id = select.value;
    $$('div.section_diagram_div').invoke('hide');
    $('section_diagram_'+document_id).show();
}

admin.HeliosUnitSectionLocationDialog.scaleImage = function(document_id, max_width, max_height){
    var image = $('diagram_image_' + document_id);
    var width = image.width;
    var height = image.height;
    
    if(width < max_width && height < max_height)
        return;
    
    var scale;
    if(width > height)
        scale = max_width/width;
    else
        scale = max_height/height;
    
    image.width = scale * width;
    image.height = scale * height;
    
}

admin.HeliosUnitSectionLocationDialog.clearHeliosUnitFrom = function(document_id){
    $('x_offset_'+document_id).value = '';
    $('y_offset_'+document_id).value = '';
    var helios_icon = $('helios_icon_'+document_id);
    helios_icon.hide();
}