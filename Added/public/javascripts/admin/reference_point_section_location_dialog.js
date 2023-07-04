/*
 * FILENAME:    reference_point_section_location_dialog.js
 * AUTHOR:      Karina Simard
 * CREATED ON:  10-09-12
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
admin.ReferencePointSectionLocationDialog = function(org_id, id) {
    var self = this;
    this.organization_id = org_id
    this.reference_point_id = id
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
    fotech.gui.ValidatingDialog.call(this, 'reference_point_section_location_dialog', cfg, 'reference_point_section_location_form');
    
    this.showEvent.subscribe(this.showSaveButton.bind(this));
    
    this.validateFields = function() {
    }
}

admin.ReferencePointSectionLocationDialog.prototype = new fotech.gui.ValidatingDialog();

/**
 * Validate and submit the form.
 */
admin.ReferencePointSectionLocationDialog.prototype.save = function() {
    if (this.validate()) {
        this.setBusyState();
        new Ajax.Request('/admin/organizations/'+this.organization_id+'/reference_points/'+this.reference_point_id+'/edit_section_location', 
                         { method: 'put', parameters: Form.serialize(this.form) });
    }
}

admin.ReferencePointSectionLocationDialog.prototype.showSaveButton = function(){
    var submitButton = $('reference_point_section_location_dialog').select('div.ft button:last-child')[0];
    submitButton.disabled = $('reference_point_section_location_form') == null;
}

admin.ReferencePointSectionLocationDialog.imageClicked = function(document_id, event){
    event.addOffsetXY();
    var section_diagram = $('diagram_image_'+document_id);
    $('x_offset_'+document_id).value = event.offsetX / section_diagram.width;
    $('y_offset_'+document_id).value = event.offsetY / section_diagram.height;
    var reference_point_icon = $('reference_point_icon_'+document_id);
    reference_point_icon.show();
    reference_point_icon.style.left = (event.offsetX - reference_point_icon.width/2) + "px";
    reference_point_icon.style.top = (event.offsetY - reference_point_icon.height/2) + "px";    
    reference_point_icon.style.position = 'absolute';
    
}

admin.ReferencePointSectionLocationDialog.imageOnload = function(document_id, x_offset, y_offset){
    admin.ReferencePointSectionLocationDialog.scaleImage(document_id, 500,500);
    var section_diagram = $('diagram_image_' + document_id);
    var reference_point_icon = $('reference_point_icon_' + document_id);
    var diagram_width = section_diagram.width;
    var diagram_height = section_diagram.height;
    reference_point_icon.style.left = ((diagram_width * x_offset) - reference_point_icon.width/2) + "px";
    reference_point_icon.style.top = ((diagram_height * y_offset) - reference_point_icon.height/2) + "px"; 
    if(x_offset == null || y_offset == null)
        reference_point_icon.hide();
    else
        reference_point_icon.show();
}

admin.ReferencePointSectionLocationDialog.switchDiagram = function(select){
    var document_id = select.value;
    $$('div.section_diagram_div').invoke('hide');
    $('section_diagram_'+document_id).show();
}

admin.ReferencePointSectionLocationDialog.scaleImage = function(document_id, max_width, max_height){
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

admin.ReferencePointSectionLocationDialog.clearReferencePointFrom = function(document_id){
    $('x_offset_'+document_id).value = '';
    $('y_offset_'+document_id).value = '';
    var reference_point_icon = $('reference_point_icon_'+document_id);
    reference_point_icon.hide();
}