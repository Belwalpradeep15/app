/*
 * FILENAME:    licenses.js
 * AUTHOR:      Darren Taylor
 * CREATED ON:  2018-01-24
 * 
 * DESCRIPTION:  Javascript utility functions for the Fotech Licenses pages
 *
 * COPYRIGHT:
 * This file is Copyright (c) 2018 Fotech Solutions Ltd. All rights reserved.
 */

/* Bind to the DOMReady event for this page, and implement the appropriate collapsable
 * sections for the licenses */

YAHOO.util.Event.onDOMReady( function(){

	var licensePanels = YAHOO.util.Dom.getElementsByClassName('license');
	licensePanels.forEach( function( el ){
		try {
			var header = el.getElementsByClassName( "show" )[0];
			var body   = el.getElementsByClassName( "body" )[0];

			if ( header && body ){
				/* bind an event to the click action of the header to toggle the visibility of the body */
				body.toggleVisibility = function(){
					body.classList.toggle("bodyhidden");
				};

				header.addEventListener( "click", body.toggleVisibility );
				body.toggleVisibility();
			}

		} catch ( e ) {
		}
	});
});

