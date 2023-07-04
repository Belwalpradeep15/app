/*
 * FILENAME:    soundStream.js
 * AUTHOR:      Karina Simard
 * CREATED ON:  10-02-05
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
 
/** Monitor namespace. */
var monitor = (monitor ? monitor : {});

monitor.soundStream = (monitor.soundStream ? monitor.soundStream : {});

var __stream_id_sequence = 0;

/** Simple SoundStream object */
monitor.SoundStream = function(fibreLineId, distance){
	this.id = __stream_id_sequence++;
	this.fibreLineId = fibreLineId;		//need to tie to fibre
	this.distance = distance;			//distance along fibre
	this.isStreaming = false;			//this will help determine if this is the stream we are tuned into
	this._img = new Image();
	this._img.onmousedown = function(e){e.preventDefault();};  //don't want the image dragging to occur
};

monitor.SoundStream.prototype.getImage = function(){
	if(this.isStreaming)
		this._img.src = "/images/stream-sound-on-16x16.png"
	else 
		this._img.src = "/images/stream-sound-16x16.png"
	return this._img;
}

