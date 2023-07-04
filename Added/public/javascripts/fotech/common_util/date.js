/*
 * FILENAME:    date.js
 * AUTHOR:      Steven Klassen
 * CREATED ON:  2008-09-26
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
 * @fileoverview Date utility methods. This file adds a number of methods to the
 *   Date class.
 */
 
Date.format = {}

/**
 * Format used to display a full date and time. 
 */
Date.format.full = "dddd, mmm d yyyy, HH:MM:ss'.'l '('Z')'";
Date.format.long = "dddd, mmm d yyyy, HH:MM:ss";
Date.format.longWithTZ = "dddd, mmm d yyyy, HH:MM:ss '('Z')'";
Date.format.column = "yyyy-mm-dd HH:MM:ss";
Date.format.time = "HH:MM:ss'.'l '('Z')'";
Date.format.simpleTime = "HH:MM:ss";

/**
 * Parse a date string in XMLSchema dateTime format. Specifically the string should
 * be the format like 2008-01-01T01:01:01.123456Z or 2008-01-01T01:01:01-06:00. We
 * will parse microseconds (i.e. six sub-second digits) but they will be converted
 * to milliseconds (i.e. three sub-second digits) due to the limitations of the
 * Javascript Date object.
 *
 * @param dateTimeStr The date/time string to parse.
 * @throws Error if the string is in an incorrect format.
 */
Date.parseXMLDateTime = function(dateTimeStr) {
    // Parse the portions of the date.
    var year = dateTimeStr.substr(0, 4);
    var month = dateTimeStr.substr(5, 2) - 1;
    var day = dateTimeStr.substr(8, 2);
    var hour = dateTimeStr.substr(11, 2);
    var minute = dateTimeStr.substr(14, 2);
    var second = dateTimeStr.substr(17, 2);
    var msec = 0;
    var tzPos = 19;
    
    // Determine the milliseconds.
    if (dateTimeStr.substr(19, 1) == '.') {
        var uSecStr = dateTimeStr.match('\\.[0-9]*');
        if (uSecStr) {
            uSecStr = uSecStr[0];   // Should only be one match.
            tzPos = tzPos + uSecStr.length;
            if (uSecStr.length > 1) {
                var usec = parseFloat(uSecStr);
                var msec = Math.round(usec * 1000.0);
            }
        }
    }
    
    // Convert it to UTC.
    var ms = Date.UTC(year, month, day, hour, minute, second, msec);
    var tzsign = dateTimeStr.charAt(tzPos);
    var offset = 0;
    if (tzsign == 'Z')
        ;   // done, no conversion needed
    else if (tzsign == '+' || tzsign == '-') {
        hour = dateTimeStr.substr(tzPos+1, 2);
        minutes = dateTimeStr.substr(tzPos+4, 2);
        offset = (hour * 60 * 60 * 1000) + (minutes * 60 * 1000);
        if (tzsign == '+')
            offset = -offset;
    }
    else {
        throw new Error("Invalid date format in string " + dateTimeStr + ".");
    }
    ms = ms + offset;
    
    // Create the date and return it.
    return new Date(ms);
    
}



/*
 * Date Format 1.2.2
 * (c) 2007-2008 Steven Levithan <stevenlevithan.com>
 * MIT license
 * Includes enhancements by Scott Trenda <scott.trenda.net> and Kris Kowal <cixar.com/~kris.kowal/>
 *
 * Accepts a date, a mask, or a date and a mask.
 * Returns a formatted version of the given date.
 * The date defaults to the current date/time.
 * The mask defaults to dateFormat.masks.default.
 */
var dateFormat = function () {
	var	token = /d{1,4}|m{1,4}|yy(?:yy)?|([HhMsTt])\1?|[LloSZ]|"[^"]*"|'[^']*'/g,
    timezone = /\b(?:[PMCEA][SDP]T|(?:Pacific|Mountain|Central|Eastern|Atlantic) (?:Standard|Daylight|Prevailing) Time|(?:GMT|UTC)(?:[-+]\d{4})?)\b/g,
    timezoneClip = /[^-+\dA-Z]/g,
    pad = function (val, len) {
    val = String(val);
    len = len || 2;
    while (val.length < len) val = "0" + val;
    return val;
    };
    // " fix code highliting in Xcode

	// Regexes and supporting functions are cached through closure
	return function (date, mask, utc, locale) {
    var dF = dateFormat;
    
    // You can't provide utc if you skip other args (use the "UTC:" mask prefix)
    if (arguments.length == 1 && (typeof date == "string" || date instanceof String) && !/\d/.test(date)) {
        mask = date;
        date = undefined;
    }
    
    // Passing date through Date applies Date.parse, if necessary
    date = date ? new Date(date) : new Date();
    if (isNaN(date)) throw new SyntaxError("invalid date");
    
    mask = String(dF.masks[mask] || mask || dF.masks["default"]);
    
    // Allow setting the utc argument via the mask
    if (mask.slice(0, 4) == "UTC:") {
    mask = mask.slice(4);
    utc = true;
    }
        
    var	_ = utc ? "getUTC" : "get",
    d = date[_ + "Date"](),
    D = date[_ + "Day"](),
    m = date[_ + "Month"](),
    y = date[_ + "FullYear"](),
    H = date[_ + "Hours"](),
    M = date[_ + "Minutes"](),
    s = date[_ + "Seconds"](),
    L = date[_ + "Milliseconds"](),
    o = utc ? 0 : date.getTimezoneOffset(),
    flags = {
    d:    d,
    dd:   pad(d),
    ddd:  dF.i18n[locale].dayNames[D],
    dddd: dF.i18n[locale].dayNames[D + 7],
    m:    m + 1,
    mm:   pad(m + 1),
    mmm:  dF.i18n[locale].monthNames[m],
    mmmm: dF.i18n[locale].monthNames[m + 12],
    yy:   String(y).slice(2),
    yyyy: y,
    h:    H % 12 || 12,
    hh:   pad(H % 12 || 12),
    H:    H,
    HH:   pad(H),
    M:    M,
    MM:   pad(M),
    s:    s,
    ss:   pad(s),
    l:    pad(L, 3),
    L:    pad(L > 99 ? Math.round(L / 10) : L),
    t:    H < 12 ? "a"  : "p",
    tt:   H < 12 ? "am" : "pm",
    T:    H < 12 ? "A"  : "P",
    TT:   H < 12 ? "AM" : "PM",
    Z:    utc ? "UTC" : (String(date).match(timezone) || [""]).pop().replace(timezoneClip, ""),
    o:    (o > 0 ? "-" : "+") + pad(Math.floor(Math.abs(o) / 60) * 100 + Math.abs(o) % 60, 4),
    S:    ["th", "st", "nd", "rd"][d % 10 > 3 ? 0 : (d % 100 - d % 10 != 10) * d % 10]
    };
    
    return mask.replace(token, function ($0) {
    return $0 in flags ? flags[$0] : $0.slice(1, $0.length - 1);
    });
	};
    }();
    
    // Some common format strings
    dateFormat.masks = {
	"default":      "ddd mmm dd yyyy HH:MM:ss",
	shortDate:      "m/d/yy",
	mediumDate:     "mmm d, yyyy",
	longDate:       "mmmm d, yyyy",
	fullDate:       "dddd, mmmm d, yyyy",
	shortTime:      "h:MM TT",
	mediumTime:     "h:MM:ss TT",
	longTime:       "h:MM:ss TT Z",
	isoDate:        "yyyy-mm-dd",
	isoTime:        "HH:MM:ss",
	isoDateTime:    "yyyy-mm-dd'T'HH:MM:ss",
	isoUtcDateTime: "UTC:yyyy-mm-dd'T'HH:MM:ss'Z'",
    xmlDateTime:    "yyyy-mm-dd'T'HH:MM:ss'.'l'Z'"
    };
    
// Internationalization strings
dateFormat._i18n_en = {
	dayNames: [
    "Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat",
    "Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"
	],
	monthNames: [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
    "January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"
	]
};

dateFormat._i18n_es = {
    dayNames: [
        "dom.", "lun.", "mar.", "mié.", "jue.", "vie.", "sáb",
        "domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"
    ],
    monthNames: [
        "enero", "feb.", "marzo", "abr.", "mayo", "jun.", "jul.", "agosto", "sept.", "oct.", "nov.", "dic.",
        "enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"
    ]
};

dateFormat._i18n_it = {
dayNames: [
            "do", "lu", "ma", "me", "gi", "ve", "sa",
            "domenica", "lunedì", "martedì", "mercoledì", "giovedì", "venerdì", "sabato"
    ],
monthNames: [
             "genn.", "febbr.", "mar.", "apr.", "magg.", "giugno", "luglio", "ag.", "sett.", "ott.", "nov.", "dic.",
             "gennaio", "febbraio", "marzo", "aprile", "maggio", "giugno", "luglio", "agosto", "settembre", "ottobre", "novembre", "dicembre"
    ] 
};

dateFormat._i18n_tr = {
    dayNames: [ "Paz", "Pzt", "Sa", "Çrs", "Prs", "Cum", "Cmt",
               "Pazar", "Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma", "Cumartesi"
               ],
    monthNames: [ "ocak", "şubat", "mart", "nisan", "mayıs", "haziran", "temmuz", "ağustos", "eylül", "ekim", "kasım", "aralık",
                 "ocak", "şubat", "mart", "nisan", "mayıs", "haziran", "temmuz", "ağustos", "eylül", "ekim", "kasım", "aralık"
                 ]
};

dateFormat.i18n = { en: dateFormat._i18n_en, es: dateFormat._i18n_es, it: dateFormat._i18n_it, tr: dateFormat._i18n_tr };


/**
 * Format the date given a mask. 
 * @param mask The formatting mask. Follows about what you would expect.
 * @param utc If true the date should be converted to UTC.
 */
Date.prototype.format = function (mask, utc, locale) {
    // If the locale is not specified then we attempt to determine it from the I18n system.
    // If that is not available either we default to english.
    if (typeof(locale) == "undefined") {
        if (typeof(I18n) == "undefined")
            locale = "en";
        else
            locale = I18n.currentLocale();
    }

    // However we obtained the locale, ensure it is one we support
    if (locale != "en" && locale != "es" && locale != "it" && locale != "tr")
        throw("InvalidArgument: unsupported locale=" + locale + ".");

    if (locale == "it")
        mask = mask.replace(/:/g, ".");

	return dateFormat(this, mask, utc, locale);
};

Date.fixDate = function(spanId, dateStr, overrideFormat, locale) {
    var format = Date.format.column;

    if (typeof(overrideFormat) != 'undefined')
        format = overrideFormat;

    if (dateStr) {
        var d;
        try {
            d = Date.parseXMLDateTime(dateStr);
        } catch ( e ){
            d = new Date( dateStr );
        };

        var el = $$('#'+spanId);
        if (el.length > 0){
            for ( var i = 0 ; i < el.length ; ++i ){
                el[i].textContent = d.format(format, false, locale );
            }
            //el.invoke('update',d.format(format, false, locale));
        }

        return d.format(format, false, locale);
    }
    return "";
}

Date.onload = function() {
  $$('.as_localtime').each(function(elem) {
    try {
      var date = Date.parseXMLDateTime(elem.innerHTML);
      elem.update(date.format(Date.format.column, false));
    }
    catch (ex) {
        console.log("Date.onload: ex=" + ex.message);
    }
  });
}

Date.prototype.elapsed = function(){
    var msecPerMinute = 1000 * 60;
    var msecPerHour = msecPerMinute * 60;
    var msecPerDay = msecPerHour * 24;

    var interval = this.getTime();

    var days  = Math.floor( interval / msecPerDay );
    interval = interval - (days * msecPerDay );

    // Calculate the hours, minutes, and seconds.
    var hours = Math.floor(interval / msecPerHour );
    interval = interval - (hours * msecPerHour );

    var minutes = Math.floor(interval / msecPerMinute );
    interval = interval - (minutes * msecPerMinute );

    var seconds = Math.floor(interval / 1000 );

    var str = '';

    if ( days > 0 ){
        str += days + 'd ';
    }

    if ( hours > 0 || days > 0 ){
        str += hours + 'h ';
    }

    if ( minutes > 0 || hours > 0 || days > 0 ){
        str += minutes + 'm ';
    }

    return str;
}