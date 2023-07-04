/*
 * FILENAME:    button.js
 * AUTHOR:      Steven Klassen
 * CREATED ON:  2009-01-22
 * 
 * LAST CHANGE:
 * $Author$
 *   $Date$
 *    $Rev$
 *    $URL$
 *
 * COPYRIGHT:
 * This file is Copyright (c) 2009 Fotech Solutions Ltd. All rights reserved.
 */

/**
 * @fileoverview YUI button extensions. It requires the inclusion of the YUI button
 *    and animation code.
 */
 
/** Fotech namespace. */
var fotech = (fotech ? fotech : {});

/** Fotech gui namespace. */
fotech.gui = (fotech.gui ? fotech.gui : {});


/**
 * Construct an illuminated button.
 * @constructor
 * @param atts the configuration attriburtes. The 'container' attribute is required
 *    and must be the id of the 'div' that will contain the button once this code
 *    constructs it. In addition to the attributes supported by YAHOO.widget.Button
 *    the following attributes are supported:
 *    buttonColor - The color of the button when activated. This must be either a hex
 *       or an rgb value. (Required)
 *
 * @class
 * Illuminated button.  This is a button that will disable itself when
 * turned on and enabled itself and flash when turned on. It is an extension of
 * YAHOO.widget.Button based on the YUI sample code for a glowing button.
 */
fotech.gui.IlluminatedButton = function(atts) {
    this.constructor.superclass.constructor.call(this, atts);
    this.setAttributeConfig("buttonColor", null, false);
    if (atts["buttonColor"] != null) {
        this.set("buttonColor", atts["buttonColor"], false);
    }
    this.addClassName("glossy");
    this.on("appendTo", this._initAnimation);
}

YAHOO.lang.extend(fotech.gui.IlluminatedButton, YAHOO.widget.Button);


/**
 * Turn the button off. This will disable the button and stop the flashing animation.
 */
fotech.gui.IlluminatedButton.prototype.turnOff = function() {
    this.set("disabled", true, false);
    this.anim.stop();
    document.getElementById(this.get("id") + "-button").style.backgroundColor = "#f0f0f0";
}

/**
 * Turn the button on. This will enable the button and start the flashing animation.
 */
fotech.gui.IlluminatedButton.prototype.turnOn = function() {
    this.set("disabled", false, false);
    this.anim.animate();
}


// Internal method used to init the animation.
fotech.gui.IlluminatedButton.prototype._initAnimation = function() {
    if (YAHOO.env.ua.ie == 6) {     // IE6 fix.
        this.addClassName("ie6-glossy");
    }
    var obutton = this;
    this.anim = new YAHOO.util.ColorAnim(this.get("id") + "-button", { backgroundColor: { to: "#f0f0f0" } });
    this.anim.onComplete.subscribe(function() {
                                   if (!obutton.get("disabled")) {
                                       this.attributes.backgroundColor.to = (this.attributes.backgroundColor.to == "#f0f0f0") ? obutton.get("buttonColor") : "#f0f0f0";
                                       this.animate();
                                       }
                              });
    if (!this.get("disabled")) {
        this.anim.animate();
    }
}


