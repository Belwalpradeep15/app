/*
 * FILENAME:    cookies.js
 * AUTHOR:      Steven Klassen
 * CREATED ON:  2009-03-17
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
 * @fileoverview Classes and utilities related to the handling of cookies.
 * This code is based on code found at http://sharkysoft.com/tutorials/jsa/content/046.html
 * There are no licensing restrictions as far as I can tell.
 */
 
/** Fotech namespace. */
var fotech = (fotech ? fotech : {});

/** Fotech util namespace. */
fotech.util = (fotech.util ? fotech.util : {});


/**
 * Construct a new cookie manager class.
 * @constructor
 * @param doc The document object containing the cookies we are to work with.
 *
 * @class
 * The Cookies class is used to help manage the cookies on a web page.
 */
fotech.util.Cookies = function(doc) {
    this.document = doc;
}

/**
 * Create a new cookie.
 * @param name The name (key) of the cookie.
 * @param value The value of the cookie.
 * @param path (optional) The cookie will be limited to this path. If not specified
 *    the document's default cookie path will be used.
 */
fotech.util.Cookies.prototype.write = function (name, value, path)
{
	// Build the expiration date string:
	var expiration_date = new Date ();
	expiration_date.setFullYear (expiration_date.getFullYear () + 1);
	expiration_date = expiration_date.toGMTString ();
    
	// Build the set-cookie string:
	var cookie_string = escape (name) + "=" + escape (value) + "; expires=" + expiration_date;
	if (path != null)
		cookie_string += "; path=" + path;
    
	// Create/update the cookie:
	this.document.cookie = cookie_string;
}

/**
 * Read a cookie.
 * @param key The name (key) of the cookie to search for.
 * @param skips (optional) If supplied this should be the number of occurences of the key
 *      that should be skipped before a value is returned. This is needed if there are
 *      multiple cookies with the same name.
 * @return the cookie value or null if there is no appropriate cookie found.
 */
fotech.util.Cookies.prototype.read = function (key, skips)
{
	// Set skips to 0 if parameter was omitted:
	if (skips == null)
		skips = 0;
    
	// Get cookie string and separate into individual cookie phrases:
	var cookie_string = "" + this.document.cookie;
	var cookie_array = cookie_string.split("; ");
    
	// Scan for desired cookie:
	for (var i = 0; i < cookie_array.length; ++i)
	{
		var single_cookie = cookie_array[i].split("=");
		if (single_cookie.length != 2)
			continue;
		var name  = unescape(single_cookie [0]);
		var value = unescape(single_cookie [1]);
        
		// Return cookie if found:
		if (key == name && skips --== 0)
			return value;
	}
    
	// Cookie was not found:
	return null;
}

/**
 * Delete a cookie by overwriting it with an expired cookie.
 * @param name The name (key) of the cookie to delete.
 * @param path (optional) The path of the cookie. If not specified the default cookie path
 *      of the document will be used.
 */
fotech.util.Cookies.prototype.remove = function (name, path)
{
	// Build expiration date string:
	var expiration_date = new Date ();
	expiration_date.setFullYear(expiration_date.getFullYear () - 1);
	expiration_date = expiration_date.toGMTString ();
    
	// Build set-cookie string:
	var cookie_string = escape (name) + "=; expires=" + expiration_date;
	if (path != null)
		cookie_string += "; path=" + path;
    
	// Delete the cookie:
	this.document.cookie = cookie_string;
}

/**
 * Delete all the cookies.
 * @param path (optional) The path for the cookies to delete. If not specified the default
 *      cookie path of the document will be used.
 */
fotech.util.Cookies.prototype.removeAll = function (path)
{
	// Get cookie string and separate into individual cookie phrases:
	var cookie_string = "" + this.document.cookie;
	var cookie_array = cookie_string.split ("; ");
    
	// Try to delete each cookie:
	for (var i = 0; i < cookie_array.length; ++i)
	{
		var single_cookie = cookie_array[i].split ("=");
		if (single_cookie.length != 2)
			continue;
		var name = unescape(single_cookie[0]);
		this.remove(name, path);
	}
}
