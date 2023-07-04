/*
 * FILENAME:    system_health.js
 * AUTHOR:      Steven Klassen
 * CREATED ON:  2010-11-17
 * 
 * DESCRIPTION: Javascript related to the system health object. This is automatically
 *              included when you include the /monitor/main/system_health partial.
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

/** Monitor namespace. */
var monitor = (monitor ? monitor : {});

/** System health namespace. */
monitor.system_health = (monitor.system_health ? monitor.system_health : {});

/** Obtain the system health. */
monitor.system_health.request = function() {
    try {
        $('system_health_table_div').addClassName('is_busy');
        vueApp.$store.dispatch( 'hardwarewatchdog/update', {} );
        $('system_health_table_div').removeClassName('is_busy');
    } catch ( e ) {
        console.log( 'error loading watchdog system health' );
    }

    /*
    $('system_health_table_div').addClassName('is_busy');
    new Ajax.Updater('system_health_table_div', '/monitor/main/system_health', { 
        method: 'get', 
        //evalScripts: true,
        onComplete: function( data ){
            console.log( 'Returned system health', data.responseJSON );
            //$('system_health_table_div').removeClassName('is_busy');
        }
    }); */   
}

