/*
 * FILENAME:    event.js
 * AUTHOR:      Karina Simard
 * CREATED ON:  10-09-15
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
 * @fileoverview Helper methods for events
 */
 
///
///  Event extensions
///

Event.prototype.addOffsetXY = function(){
    var xy = this.element().viewportOffset();
    this.offsetX = this.offsetX || this.clientX - xy[0];
    this.offsetY = this.offsetY || this.clientY - xy[1];
}