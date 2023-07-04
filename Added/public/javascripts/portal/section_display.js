/*
 * FILENAME:    section_display.js
 * AUTHOR:      Steven Klassen
 * CREATED ON:  2010-02-26
 * 
 * DESCRIPTION: Trimmed down version of the SectionDisplay class for the portal.
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

// Construct a section display that will be rendered into the given div.
SectionDisplay = function(divId, fibreLineId, document_id) {
    SectionDisplayBase.call(this, divId, fibreLineId);
    this.helios_units = new Array();
    this.reference_points = new Array();
    this.document_id = document_id;
}

SectionDisplay.prototype = new SectionDisplayBase(null, null);


// Reset the display.
SectionDisplay.prototype.reset = function() {
    this._resetView();
}

//----------Display Helios Units -----------------
/**
 * Method which will add helios units to helios unit list
 */
SectionDisplay.prototype.addHeliosUnit = function(id,name,xoffset,yoffset){
    this.helios_units.push({id:id,name:name,xoffset:xoffset,yoffset:yoffset})
    this.render();
}

SectionDisplay.prototype.drawHeliosUnits = function(ctx){
    var img = new Image();
    img.src = "/images/fotech/common_gui/helios_unit.png";
    
    for (var i = 0, len = this.helios_units.length; i < len; ++i) {
        var unit = this.helios_units[i];
        ctx.drawImage(img, this.view._adjX(unit.xoffset) - (img.width/2), this.view._adjY(unit.yoffset) - (img.height/2));
    }
}

//----------Display Reference points -----------------
/**
 * Method which will add reference points
 */
SectionDisplay.prototype.addReferencePoint = function(id,label,xoffset,yoffset){
    this.reference_points.push({id:id,label:label,xoffset:xoffset,yoffset:yoffset})
    this.render();
}

SectionDisplay.prototype.drawReferencePoints = function(ctx){
    var img = new Image();
    img.src = "/images/fotech/common_gui/reference_point-16x16.png";
    
    for (var i = 0, len = this.reference_points.length; i < len; ++i) {
        var point = this.reference_points[i];
        ctx.drawImage(img, this.view._adjX(point.xoffset) - (img.width/2), this.view._adjY(point.yoffset) - (img.height/2));
    }
}


