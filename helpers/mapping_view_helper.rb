# FILENAME:     mapping_view_helper.rb
# AUTHOR:       Steven Klassen
# CREATED ON:   2009-02-03
#
# DESCRIPTION:  View helpers provided by the fotech mapping plugin.
#
# LAST CHANGE:
# $Author$
#   $Date$
#    $Rev$
#    $URL$
#
# COPYRIGHT:
# This file is Copyright (c) 2009 by Fotech Solutions. All rights
# reserved.

require 'net/ping'
require 'resolv-replace'


# This module provides methods that will be added to views when this plugin is included.
module MappingViewHelper

    # Create the script and css links needed to setup the implementation specific mapping components.
    # caches the implementation files
    def fotech_mapping_impl_tag

        cacheName = '__mapping_provider'

        str = ''

        map_provider = APP_CONFIG['monitor']['map_provider']
        map_key = APP_CONFIG['monitor']['map_key']
        map_impl_js = 'fotech/mapping/map_null_impl.js'

        if map_provider.nil? or (map_provider == 'none')
            return ''
        elsif map_provider == 'leaflet'  # default, and almost always needed so not optional

        elsif map_provider == 'cloudmade'
            str.concat "<script type='text/javascript' src='http://tile.cloudmade.com/wml/latest/web-maps-lite.js'></script>\n"
            map_impl_js = 'fotech/mapping/map_cloudmade_impl.js'
        elsif map_provider == 'google'
            raise "Missing the required map_key or google_map_client setting." \
                if map_key.nil? and APP_CONFIG['monitor']['google_map_client'].nil?

            map_url = '//maps.googleapis.com/maps/api/js'

            if APP_CONFIG['monitor']['google_map_client']
              client_key, host = APP_CONFIG['monitor']['google_map_client'].split(',')
              map_url += "?client=#{client_key}"
            elsif !map_key.nil?
              map_url += "?key=#{map_key}"
            end

            if map_is_available?
                str.concat "<script type='text/javascript' src='#{map_url}'></script>\n"
            end

            map_impl_js = 'fotech/mapping/map_gmap_impl.js'
        else
            raise "Invalid map_provider #{map_provider}"
        end

        jscripts = []
        jscripts << map_impl_js

        jscripts << { :cache => cacheName } if cacheName
        str.concat javascript_include_tag(*jscripts)


        str.concat \
        "
        <script type='text/javascript'>
            fotech.map.Map.mapProvider = \"#{APP_CONFIG['monitor']['map_provider']}\";
        </script>
        "
        return str.html_safe
    end

    def fotech_core_mapping_components_tag

        cacheName = '__core_map_diagram_layers'

        str = ''
        str.concat stylesheet_link_tag 'fotech/mapping/pub/leaflet/leaflet.css' , :media => "all"
        str.concat "\n"

        jscripts = []

        if Rails.env.development?
            jscripts << 'fotech/mapping/pub/leaflet/leaflet-src.js'
        else
            jscripts << 'fotech/mapping/pub/leaflet/leaflet.js'
        end

        jscripts << 'fotech/common_util/geometry.js'
        jscripts << 'fotech/common_util/pub/latlon.js'
        jscripts << 'fotech/common_util/pub/geo.js'
        jscripts << 'fotech/common_util/gis.js'
        jscripts << 'fotech/common_util/debounce.js'
        jscripts << 'fotech/mapping/map.js'
        jscripts << 'fotech/mapping/diagram.js'
        jscripts << 'fotech/mapping/map_leaflet_impl.js'

        jscripts << 'fotech/mapping/lat_long_track.js'
        jscripts << 'fotech/mapping/fibre.js'

        # Map Layers
        jscripts << 'fotech/mapping/map_layer.js'
        jscripts << 'fotech/mapping/helios_layer.js'

        jscripts << 'fotech/fibre/event.js'
        jscripts << 'fotech/fibre/event_type.js'
        jscripts << 'fotech/mapping/events_layer.js'
        jscripts << 'fotech/mapping/alerts_layer.js'
        jscripts << 'fotech/mapping/ref_point_layer.js'
        jscripts << 'fotech/mapping/connector_layer.js'
        jscripts << 'fotech/mapping/on_route_layer.js'
        jscripts << 'fotech/mapping/fibre_layer.js'
        jscripts << 'fotech/mapping/broken_fibre_layer.js'
        jscripts << 'fotech/mapping/markers_layer.js'

        # Map controls
        jscripts << 'fotech/mapping/select_region.js'
        jscripts << 'fotech/mapping/draw_polygons.js'
        jscripts << 'fotech/mapping/annotation_editor.js'
        jscripts << 'fotech/mapping/audio.js'
        jscripts << 'fotech/mapping/audio_layer.js'
        jscripts << 'fotech/mapping/fibre_region_layer.js'
        jscripts << { :cache => cacheName } if cacheName
        str.concat javascript_include_tag(*jscripts)

        return str.html_safe
    end

    # Perform a javascript include only if the maps are available.
    def fotech_mapping_javascript_include_tag(jsfile)
        if map_is_available?
            return javascript_include_tag(jsfile)
        else
            return ""
        end
    end

    # Determine if the google maps are available.
    def map_is_available?
        provider = APP_CONFIG['monitor']['map_provider']

        return false if provider == 'none'
        return true if provider == 'leaflet'
        return Net::Ping::HTTP.new(uri='http://tile.cloudmade.com', timeout=5).ping if provider == 'cloudmade'

        if provider == 'google'
            host = request.env["HTTP_HOST"]

            valid_domains = APP_CONFIG['monitor']['google_map_client'].split(',')
            valid_domains.shift  #get rid of first one because that is the client key
            valid_host = false
            valid_domains.each do |domain|
                valid_host ||= host[/#{domain}$/]
            end
            return (valid_host Net::Ping::HTTP.new(uri='http://maps.google.com', timeout=5).ping)
        end
    end

end
