/*
 * FILENAME:    math.js
 * AUTHOR:      Steven Klassen
 * CREATED ON:  2008-12-19
 * 
 * DESCRIPTION: Some useful math utility methods.
 *
 * LAST CHANGE:
 * $Author$
 *   $Date$
 *    $Rev$
 *    $URL$
 *
 * COPYRIGHT:
 * This file is Copyright (c) 2008 Fotech Solutions Ltd. All rights reserved.
 */

/**
 * @fileoverview Useful math utilities.
 */
 
/** Fotech namespace. */
var fotech = (fotech ? fotech : {});

/** Fotech util namespace. */
fotech.util = (fotech.util ? fotech.util : {});


/**
 * Generate a uuid 
 * found at stackoverflow: http://stackoverflow.com/questions/105034/how-to-create-a-guid-uuid-in-javascript/2117523#2117523
 **/
fotech.util.uuid = function(){
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c){
                                                          var r = Math.random()*16|0, v = c == 'x' ? r : (r&0x3|0x8);
                                                          return v.toString(16);
                                                          });
}

/**
 * Obtain a random number between low and high.
 */
fotech.util.random = function(low, high) {
    return (Math.random() * (high - low)) + low;
}

/**
 * Round to the given power of 10.
 * @param num the original number.
 * @param pow the power of 10 (1 = 10, 2 = 100, etc.).
 * @return the new number.
 */
fotech.util.round10 = function(num, pow) {
    if (pow >= 0) {
        var scale = Math.pow(10, pow);
        return Math.round(num / scale) * scale;
    }
    else {
        var scale = Math.pow(10, -pow);
        return Math.round(num * scale) / scale;
    }
}

/**
 * Ceiling to the given power of 10.
 * @param num the original number.
 * @param pow the power of 10 (1 = 10, 2 = 100, etc.).
 * @return the new number.
 */
fotech.util.ceil10 = function(num, pow) {
    if (pow >= 0) {
        var scale = Math.pow(10, pow);
        return Math.ceil(num / scale) * scale;
    }
    else {
        var scale = Math.pow(10, -pow);
        return Math.ceil(num * scale) / scale;
    }
}

/**
 * Floor to the given power of 10.
 * @param num the original number.
 * @param pow the power of 10 (1 = 10, 2 = 100, etc.).
 * @return the new number.
 */
fotech.util.floor10 = function(num, pow) {
    if (pow >= 0) {
        var scale = Math.pow(10, pow);
        return Math.floor(num / scale) * scale;
    }
    else {
        var scale = Math.pow(10, -pow);
        return Math.floor(num * scale) / scale;
    }
}

/**
 * Convert a number to a close "nice" number.
 * @param num the original number.
 * @param round either "up" or "down" or "close" (the default).
 * @return the new number.
 */
fotech.util.niceNumber = function(num, round) {
    // Determine which direction we need to round.
    var roundFn = Math.round;
    if (typeof(round) != 'undefined') {
        if (round == "up")
            roundFn = Math.ceil;
        else if (round == "down")
            roundFn = Math.floor;
    }
    
    // Determine the scale of the input number.
    var anum = Math.abs(num);
    var pow = parseInt(parseFloat(num).toExponential().gsub(/.*e/,''));
    var scale = Math.pow(10, pow);
    
    // Determine the nice number.
    var sign = (num >= 0 ? 1 : -1);
    var basenum = roundFn(anum / scale);
    if (basenum >= 9)
        basenum = 10;
    else if (basenum >= 7)
        basenum = 7.5;
    else if (basenum >= 4)
        basenum = 5;
    else if (basenum >= 2)
        basenum = 2.5;
    else if (basenum >= 1)
        basenum = 1;
    return sign * basenum * scale;
}


/**
 * Perform a unit conversion. If the to and from units are the same the original value will
 * be returned. Otherwise the conversion will be performed if possible. If the conversion is
 * not possible, due to not being supported, an exception will be thrown. Currently the
 * following unit conversions are supported:
 *   'm' to 'ft'
 *   'ft' to 'm'
 *
 * Note that if you make changes to this method you should also change the convert.rb
 * file to ensure that conversions are consistent on both the client and server code.
 *
 * @param val the original value.
 * @param fromunits the origiinal units.
 * @param tounits the target units.
 * @param decimals the number of decimal places to report to. (optional)
 * @param constants a hash of any additional values that may be needed to convert
 * @return the new value
 */
fotech.util.convert = function(val, fromunits, tounits, decimals) {
    if (fromunits == tounits)
        ;
    else if (fromunits == 'C' && tounits == 'F')
        val = (9.0 / 5.0) * val + 32.0
    else if (fromunits == 'F' && tounits == 'C')
        val = (5.0 / 9.0) * (val - 32.0)
    else {
        var convs = fotech.util._CONVERSIONS[fromunits];
        var conv = (convs ? convs[tounits] : null);
        if (conv == null)
            throw "Unsupported unit conversion from '" + fromunits + "' to '" + tounits + "'.";
        val = val * conv;
    }
    
    if (typeof(decimals) == 'undefined')
        return val;
    else {
        var precision = parseInt(decimals);
        var scale = Math.pow(10, precision);
        return Math.round(val * scale) / scale;
    }
}
fotech.util._METRES_TO_FEET = 3.2808399166666664;
fotech.util._METRES_TO_KILOMETRES = 0.001;
fotech.util._METRES_TO_MILES = 6.21371192e-4;
fotech.util._SECONDS_TO_HOUR = 3600;
fotech.util._CONVERSIONS = {
    'm': { 'ft': fotech.util._METRES_TO_FEET, 'km': fotech.util._METRES_TO_KILOMETRES, 'mi': fotech.util._METRES_TO_MILES },
    'ft': { 'm': 1.0/fotech.util._METRES_TO_FEET },
    'km': { 'm': 1.0/fotech.util._METRES_TO_KILOMETRES },
    'mi': { 'm': 1.0/fotech.util._METRES_TO_MILES },
    'm_s' : {'ft_s' : fotech.util._METRES_TO_FEET, 'km_h' : fotech.util._METRES_TO_KILOMETRES * fotech.util._SECONDS_TO_HOUR, 'mi_h' : fotech.util._METRES_TO_MILES * fotech.util._SECONDS_TO_HOUR },
    'ft_s' : {'m_s' : 1.0/fotech.util._METRES_TO_FEET},
    'km_h' : {'m_s' : 1.0/(fotech.util._METRES_TO_KILOMETRES * fotech.util._SECONDS_TO_HOUR)},
    'mi_h' : {'m_s' : 1.0/(fotech.util._METRES_TO_MILES * fotech.util._SECONDS_TO_HOUR)},
    'm_s2' : {'ft_s2' : fotech.util._METRES_TO_FEET, 'km_h2' : fotech.util._METRES_TO_KILOMETRES * Math.pow(fotech.util._SECONDS_TO_HOUR,2), 'mi_h2' : fotech.util._METRES_TO_MILES * Math.pow(fotech.util._SECONDS_TO_HOUR,2) },
    'ft_s2' : {'m_s2' : 1.0/fotech.util._METRES_TO_FEET},
    'km_h2' : {'m_s2' : 1.0/(fotech.util._METRES_TO_KILOMETRES * Math.pow(fotech.util._SECONDS_TO_HOUR,2))},
    'mi_h2' : {'m_s2' : 1.0/(fotech.util._METRES_TO_MILES * Math.pow(fotech.util._SECONDS_TO_HOUR,2))}
};


/**
 * Assumptions that this lazy convert assumes:
 * 'distance' is converting value from m
 */
fotech.util.lazyConvert = function(value, unitType, preferences){
    var val = value;
    
    switch(unitType){
        case 'distance':
            val = fotech.util.convert(parseFloat(value), 'm', preferences['units-distance'], parseInt(preferences['precision-distance']));
            val += preferences['units-distance'];
            break;
        case 'velocity':
            val = fotech.util.convert(parseFloat(value), 'm_s', preferences['units-velocity'], parseInt(preferences['precision-velocity']));
            val += preferences['units-velocity'];
            break;
        default:
            break;
    }
    
    return val;
}

 /**
  * Conserve aspect ratio of the orignal region. Useful when shrinking/enlarging
  * images to fit into a certain area.
  *
  * @param {Number} srcWidth Source area width
  * @param {Number} srcHeight Source area height
  * @param {Number} maxWidth Fittable area maximum available width
  * @param {Number} maxHeight Fittable area maximum available height
  * @return {Object} { width, heigth }
  */
fotech.util.calculateAspectRatioFit = function(srcWidth, srcHeight, maxWidth, maxHeight) {

    var ratio = [maxWidth / srcWidth, maxHeight / srcHeight ];
    ratio = Math.min(ratio[0], ratio[1]);

    return { width:srcWidth*ratio, height:srcHeight*ratio };
 }