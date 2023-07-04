/* Audio Player Javascript
 * Copyright 2018 Fotech Solutions Ltd
 * 
 * Utiltiy wrapper for the Audio Player, the bulk of the player comes from a connected helios
 * unit, however connecting to it and manipulating the player is managed via the panoptes UI
 *
 * */


document.addEventListener('DOMContentLoaded', function(){

    /* find the iframe, most of our controls are based upon it */
    var players = document.querySelectorAll('[data-helios-audio]');

    players.forEach( function( player ){
        /* Retrieve the properties from the player as to hostname, session ID etc */
        var session_id = player.getAttribute('data-session-id');
        var helios_hostname = player.getAttribute('data-helios-hostname');
        var playername = player.getAttribute('name');
        var start_m = player.getAttribute('data-helios-start');
        var end_m = player.getAttribute('data-helios-end');

        /* Configure the iframe to behave responsibly, and to tell us when things have happened */
        player.addEventListener('iframeMessage', function(){
            /* The player has finished loading */
            player.style.display = "block";
            /* And hide the spinner */
            document.querySelectorAll('.audioplayer .loading').forEach( function(spinner){
                spinner.style.display = 'none';
            });

            /* now the player has finished loading, we can bind to some of its events */
           /* we also need to pass those event handlers the other way round too */

            player.addEventListener( 'audio_loaded', function(){
                Event.fire(window, 'message:audio_loaded', sesson_id);
            });
            player.addEventListener( 'audio_unloaded', function(){
                Event.fire(window, 'message:audio_unloaded',sesson_id);
            });
        });

        var url = 'http://' + helios_hostname + '/audio_player?audio_session_id='+ session_id + '&start=' + start_m + '&end=' + end_m + '&play';

        var connectionTimeout;

        /* Create a simple timeout window which will kick in if the open command takes too long */
        var errorHandler = function( messageType ){
            document.querySelectorAll('.audioplayer').forEach(function(audiobody){
                audiobody.classList.add("error");
                audiobody.classList.add( messageType !== undefined ? messageType : 'general' );
            });
            clearTimeout( connectionTimeout );
        }

        connectionTimeout = setTimeout( errorHandler, 5000 );

        /* Do some preflight checks to see if audio is supported on the remote Helios box */
        try {
            /* try to GET the audio player, in a simple form, without running JS etc and trap errors
             * as these will reflect whether the helios box is capable of responding */
            var audioAvailable = new Ajax.Request( url, {
                method: 'get',
                onFailure: function(e){
                    errorHandler( 'unsupported' );
                },
                onSuccess: function(e){
                    if ( e.status != 200 ){
                        errorHandler( 'unsupported' );
                    }
                },
                evalJSON: false,
                evalJS: false
            });
        } catch (e){
            errorHandler( 'unsupported' );
        }

        /* Open the iFrame, rather than setting its src, this means the iframe will have a
         * window.opener rather than a window.parent */
        window.open( url, playername, {} );

        window.addEventListener( 'beforeunload', function(){
            try {
                window.opener.Event.fire(window.opener, 'message:audio_unloaded',session_id);
            } catch ( e ){
                console.log( "Cannot destroy!", e );
            }
        });

        window.addEventListener( 'message', function(message){
                /* we receive messages from our opener, and from our iframe */
                /* direct them accordingly */

                var messageData;

                if ( event.source == window.opener || event.source == window.parent.opener ){
                    /* *we* are the originator of the message, not the helios unit */
                    /* Helios doesn't seem to send or accept data in strange formats */
                    player.contentWindow.postMessage( message.data, '*');
                } else {
                    /* messages which we want to send to the controller will be JSON decoded */
                    /* using JSON.parse, we should ensure that they can be understood as such */
                    message = JSON.parse( message.data );
                    messageData = JSON.stringify( message );

                    /* Generally speaking we want to just send the message directly back to the controller
                     * however, some messages are essentially window events so we need to intercept and
                     * deal with those. */

                    ( window.opener || window.parent.opener ).postMessage( messageData, '*' );

                    switch(message.command)
                    {
                        case 'worker_closed':
                            /* The worker has shut down operations and is trying to unload itself */
                            window.close();
                            break;
                    }
                }

                /* Signal to ourselves that we have received a message, the audio player only starts
                 * sending them when it is ready, so this is pretty close to a DOMContentLoaded event
                 * which we aren't privvy to as the Helios box is a different Origin */

                /* Uncomment the setTimeout to force an error */
                //setTimeout( function(){
                var ev = new Event('iframeMessage');
                player.dispatchEvent(ev);
                //}, 8000 );
        });
    } );
});

