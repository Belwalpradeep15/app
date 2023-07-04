/* Markers page specific Javascript */

FotechCore.DOMReady( function(){
    console.log( "Markers ready!" );

    /* Bind to change events which denote when markers have been moved
     * and their effects applied (saved), use those details to update
     * the locations of the associated marker */

    window.addEventListener('fotech:map.marker.saved', function(ev){
        console.log( "Map marker saved... ", ev );
        try {
            var marker = ev.detail;

            if ( marker ){
                var element = document.getElementById( 'latlng_' + marker.organization_id + '_' + marker.id );
                if ( element ){
                    console.log( element );
                    /* The "converted" field gives us most of the information, however
                     * it hasn't been cast to a fixed length string, so we should
                     * truncate it accordingly */
                    var coords = marker.converted.split(',');
                    element.textContent = parseFloat(coords[0]).toFixed(8) + ',' + parseFloat(coords[1]).toFixed(8);
                }
            }
        } catch(e) {
            /* Wrap in an exception handler incase something goes wrong */
        };
    });

});