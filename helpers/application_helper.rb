# $Author$
# $Date$
# $Rev$
# $URL$
#
# COPYRIGHT:
# This file is Copyright © 2009 Fotech Solutions Ltd. All rights reserved.

require 'fotech/unit_conversions'
require 'time_ext'


module ApplicationHelper

    # Escape any HTML reserved characters. This is intended for cases where we cannot control
    # the input characters (i.e. user input) and where we are not using the more standard XML
    # builders. Note that this changes the input string as well as returns it. If you do not
    # want the original string to be changed you can call it using
    #   str2 = escape_xml(str.dup)
    #
    # This algorithm is based on one found at http://www.ruby-forum.com/topic/120436 . There is no
    # copyright that I can find.
    def escape_html(str)
        str.gsub!(/[&<>'"]/) do | match |      # ' get around xcode parsing problem
            case match
            when '&' then '&amp;'
            when '<' then '&lt;'
            when '>' then '&gt;'
            when "'" then '&apos;'
            when '"' then '&quote;'
            end
        end
        return str
    end

    # Returns an appropriate checked string if the flag is true.
    def checked_if(isTrue)
      if isTrue
          return 'checked="checked"'
      else
          return ''
      end
    end

    # Returns an appropriate disabled string if the flag is true.
    def disabled_if(isTrue)
        if isTrue
            return 'disabled="disabled"'
        else
            return ''
        end
    end

    # Display astring, accounting for our special prefixes.
    def optional_i18n(value, prefix = /^i18n: /)
        if not value
            return ""
        elsif value.match(prefix)
            full_t_string = value.gsub(prefix, '')
            list = full_t_string.split(' ')
            t_string = list[0]
            param_strings = list - [t_string]
            params = {}
            param_strings.each do |param_pair|
                k,v = param_pair.split(':')
                params[k.to_sym] = v
            end

            return I18n.t(t_string, params)
        else
            return value
        end
    end

    #this method is like optional_i18n except that it will screen for more than one prefix
    # valid prefixes
    #   'i18n: '   will pass whatever comes after the prefix to the I18n.t method
    #   'convert: ' will expect something like "convert: <number> <unit>" where unit needs to be something we recognize
    def optional_translate(value, preferences)
        logger.debug "preferences = #{preferences}" # This is empty for emails at the moment...

        if not value
            return ""
        elsif value.match(/^i18n: /)
            return I18n.t(value.gsub(/^i18n: /, ''))
        elsif value.match(/^eventType: /)
            et = EventType.where(name: value.gsub(/^eventType: /, '')).first
            if et.nil?
                return value
            else
                return et.description
            end
        elsif value.match(/^convert: /)
            prefix, a_value, unit = value.split(' ')
            return lazy_convert(a_value.to_f, unit.strip, preferences).to_s
		elsif value.match(/^[0-9]*m$/)
			return lazy_convert(value.to_f, 'm', preferences).to_s
        elsif value.match(/^POINT\(.* .*\)/)
            m = value.match(/^POINT\((.*) (.*)\)/)
            lat = m[2]
            lng = m[1]
			latLngUnits = (preferences ||= {})["units-latlng"] ||= 'deg_dec'
		    latLngPrecision = (preferences ||= {})["precision-latlng"] ||= 8
			return convertLatLngForDisplay(lat, lng, 'deg_dec', latLngUnits, latLngPrecision)
        else
            return value
        end
    rescue => ex
        return "Error: #{ex.message}, #{value} > #{prefix}, #{a_value}, #{unit}"
    end

    # Given a set of preference definitions return the javascript used to create a preferences
    # map.
    def preferences_tag(preference_defs, prefs)
        str = "var __prefs = new Object();\n"
        preference_defs.each do |section|
            section[:preferences].each do |pref|
                str << "__prefs['#{pref[:key]}'] = \"#{pref[:value]}\";\n"
            end
        end
        str << "#{prefs} = __prefs;\n"
        str.html_safe
    end

    #returns a string with the value and the units it converted to
    def lazy_convert(val, fromunits, preferences)
        conversion_type = ''
        case fromunits
            when 'm', 'ft', 'km', 'mi'
                conversion_type = 'distance'
            when 'm_s','ft_s','km_h','mi_h'
                conversion_type = 'velocity'
            when 'm_s2','ft_s2','km_h2','mi_h2'
                conversion_type = 'acceleration'
            else
                conversion_type = ''
        end

        return "#{value} #{fromunits}" if conversion_type == ''

        tounits = preferences["units-#{conversion_type}"]
        value = convert(val, fromunits, tounits, preferences["precision-#{conversion_type}"])
        return "#{value} #{tounits}"
    end

    # Perform a unit conversion. This is just a wrapper around the UnitConversions module.
    def convert(val, fromunits, tounits, decimals)
        return UnitConversions.convert(val, fromunits, tounits, decimals)
    end

    def convertLatLng(lat,lng,from,to, decimals)
        return UnitConversions.convertLatLng(lat,lng,from,to,decimals)
    end

    def convertLatLngForDisplay(lat,lng,from,to,decimals)
        return UnitConversions.convertLatLngForDisplay(lat,lng,from,to,decimals)
    end


    # Display the local timezone of the browser. Note that this will require inclusion
    # of fotech/common_util/date.js to work properly.
    def timezone_tag()
        id = "timezone_#{ rand(100000) }"
        tz = "<span id='#{id}'></span>"
        str = <<-TAG
        <p class="help">(#{I18n.t('common.time.timezone', :timezone => tz)})</p>
        <script type="text/javascript">
            if ($('#{id}'))
                $('#{id}').update((new Date()).format("Z", false));
        </script>
        TAG
        str.html_safe
    end

    # Add items that are required to ensure browser compatibility.
    def browser_compatibility_tag
        # Meta tags required by the chrome plugin.
        tags = ""
        user_agent = request.env['HTTP_USER_AGENT']
        if user_agent.include? 'chromeframe'
            tags << '<meta http-equiv="X-UA-Compatible" content="chrome=1"/>'
        end

        # Some browsers don't have native javascript parsing
        tags << javascript_include_tag('fotech/common_util/compat/json2.js')

        tags.html_safe
    end

    # return image tag that represents YES/TRUE or NO/FALSE, accepts boolean
    def yes_no_icon(b)
        return image_tag "#{b ? 'yes' : 'no'}-16x16.png"
    end

    def add_fibre_region(line, region)
      return '' unless region.visible

      properties = region.region_properties
      region_desc = escape_javascript region.description
      positions = {
          :starting_position => region.starting_position,
          :length => region.length,
          :ending_position => region.ending_position
      }

      %/
      fibre_region_layer.addRegion('#{region_desc}', #{line.id}, #{positions.to_json}, #{properties.to_json});
      /
    end

    # add the details of the on Route path to the map
    # assumes that any fibreRoutes have already been added to the map
    def add_path(path)
        path_json = path.to_json
        path_segments_json = PathSegment.where(path_id: path.id).order("distance_from_marker ASC, segment_order ASC").to_json
      %/ on_route_layer.add_on_route_path( #{path_json}, #{path_segments_json}, fibre_route_layer.routes) /.html_safe
    end


    def include_i18n
        javascript_include_tag('i18n.js') +
        javascript_include_tag('translations', skip_pipeline: true) +
        javascript_tag do
            """
            I18n.defaultLocale = 'en'
            I18n.locale = '#{session[:current_user_locale] || "en"}';
            """.html_safe
        end
    end

    def dialog_wrapper(dialog_name, options = {})
        classNames = options[:class] || ''
        classNames += options[:solid_bg] == true ? '' : ' fotech_dialog'
        classNames += options[:printable] == false ? ' noprint' : ''
        str = <<-wrapper_string
            <div id="#{dialog_name}_dialog" style="visibility:hidden" class="#{classNames}">
                <div class="hd">
                    #{ I18n.t(options[:title]) }
                </div>
                <div id="#{dialog_name}_dialog_body" class="bd">
                    #{options[:content] if options[:content]}
                </div>
            </div>
        wrapper_string
        str.html_safe
    end

    def alert_display_icon(alert)
        status = alert.detail('alarm-status')
        status = "alert" if status.nil?

        str = <<-string
            <div style="width:80px; height:69px; background:transparent url(#{alert.large_icon}) no-repeat center center;">
                <div style="width:80px; height:69px; background:transparent url(/images/#{status}_large.png) no-repeat center center;opacity:0.6;"></div>
            </div>
        string
        str.html_safe
    end

    def alert_type_display_string(alert)
        return alert.description
    end

    def truncate_middle(string, len, separator='...')
        return string if string.length <= len

        #return separator if separator.length >= len

        head_size = ((len - separator.length)/2).ceil
        tail_size = ((len - separator.length)/2).floor

        string.gsub(/^(.{#{head_size}}).*(.{#{tail_size}})$/, "\\1#{separator}\\2")
    end

    def flatten_parameters( params, omit )
        # flatten complex parameters down into a simple HASH for use in form building
        omit = omit.nil? ? [] : omit
        newParams = []
        basename = '%%'
        params = params.permit!.to_hash
        params.each do | name, value |
            _process_value( newParams, basename, name, value, omit )
        end
        logger.info( "flattened_parameters: #{newParams}" )
        return newParams
    end

    def _process_value( params, basename, name, value, omit )
        logger.info( "Processing #{name} #{value} #{value.class}")
        logger.info( omit.inspect )
        if ( value.is_a?(Hash) )
            value.each do | subname, subval |
                _process_value( params, name + '[%%]', subname, subval, omit )
            end
        elsif ( value.is_a?(Array) )
            value.each do | subval |
                newname = basename.gsub('%%', name) + '[]'
                if ( !omit.include?( newname ))
                    params << _html_param( newname, subval )
                end
            end
        else
            newname = basename.gsub('%%', name)
            if( !omit.include?( newname ))
                params << _html_param( basename.gsub('%%', name ), value )
            end
        end
    end

    def _html_param( name, value )
        return "<input type=\"hidden\" name=\"#{name}\" value=\"#{value}\">"
    end
end
