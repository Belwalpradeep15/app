/*
 * FILENAME:    calendar_setup.js
 * AUTHOR:      Steven Klassen
 * CREATED ON:  2009-01-30
 * 
 * DESCRIPTION: Method used to simplify the setup of a calendar.
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

/** Fotech namespace. */
var fotech = (fotech ? fotech : {});

/** Fotech gui namespace. */
fotech.gui = (fotech.gui ? fotech.gui : {});

/**
 * Convert a date string of the format returned by the calendar object into
 * an XML dateTime object.
 * @param dt The date/time string.
 * @param toEnd The time is to be used as an end time, otherwise it is a start time.
 * @return the xml date/time string.
 */
fotech.gui.toXmlDateTime = function(dt, toEnd) {
    if (dt && dt != "") {
        // Determine the local timezone.
        var now = new Date();
        var localTimezone;
        var offset = now.getTimezoneOffset();
        if (offset == 0)
            localTimezone = "Z";
        else if (offset > 0)
            localTimezone = String.sprintf("-%02d:%02d", offset/60, offset%60);
        else {
            offset = -offset;
            localTimezone = String.sprintf("+%02d:%02d", offset/60, offset%60);
        }
        
        // Reformat the date/time.
		var str = dt.substr(0,10) + "T";
		
		if(dt.length > 10){ 
			str += dt.substr(11,5);
		}
		else{   //only date is provided, use toEnd to determine if we should use beginning of day or end of day
			if(toEnd)
				str += "23:59"
			else
				str += "00:00"
		}
         
        if (toEnd)
            str += ":59";
        else
            str += ":00";
        str += localTimezone;
        return str;
    } else {
        return "";
    }
}

// This is a wrapper around Calendar.setup used to make it a little easier to
// implement in our fotech_calendar tag. You really shouldn't call this manually.
// It is intended only to be called from the fotech_calendar tag.
function _fotechSetupCalendar(name,options) {
    options = options || {};
    Calendar.setup($H({
                   inputField: name + "Id",
                   ifFormat: "%Y-%m-%d %H:%M",
                   button: name + "Img",
                   weekNumbers: false,
                   align: "Bl",
                   showsTime: true,
                   showOthers: true,
                   singleClick: true }).merge($H(options)).toObject());
}

