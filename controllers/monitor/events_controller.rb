# $Author$
# $Date$
# $Rev$
# $URL$
#
# COPYRIGHT:
# This file is Copyright (c) 2009 Fotech Solutions Ltd. All rights reserved.
require 'json'

class Monitor::EventsController < MonitorController

    # Setup the events search page.
    def initsearch
        params[:search] = JSON.parse(params[:alert_search]) if params[:alert_search]
        setup_menu
        @suppressUser = true
        @title = I18n.t('monitor.events.init_search.title')
        @distance_units = get_preference('units-distance')[:value]
        @distance_precision = get_preference('precision-distance')[:value]
        @velocity_units = get_preference('units-velocity')[:value]
        @acceleration_units = get_preference('units-acceleration')[:value]
        @latlng_format = get_preference('units-latlng')[:value]
        @latlng_precision = get_preference('precision-latlng')[:value]
        paths = Path.not_deleted.where(organization_id: current_user.organization_ids).select("name, label_towards, label_away").order("name")
        @required_path_hash = {}
        paths.each{|path|
             @required_path_hash[path.name] ||= []
             @required_path_hash[path.name] << path.label_towards
             @required_path_hash[path.name] << path.label_away
             @required_path_hash[path.name].uniq!
        }
    end

    # Perform a search.
    def search
        @distance_units = get_preference('units-distance')[:value]
        @distance_precision = get_preference('precision-distance')[:value]
        @velocity_units = get_preference('units-velocity')[:value]
        @acceleration_units = get_preference('units-acceleration')[:value]
        @latlng_format = get_preference('units-latlng')[:value]
        @latlng_precision = get_preference('precision-latlng')[:value]
        @paths_all = Path.get_system_paths(current_user.organization_ids)
        params[:search] = JSON.parse(params[:alert_search]) if params[:alert_search]
        paths = Path.not_deleted.where(organization_id: current_user.organization_ids).select("name, label_towards, label_away").order("name")
        @required_path_hash = {}
        paths.each{|path|
             @required_path_hash[path.name] ||= []
             @required_path_hash[path.name] << path.label_towards
             @required_path_hash[path.name] << path.label_away
             @required_path_hash[path.name].uniq!
        }
        perform_search

        if params[:format] == 'csv'
            @tz_offset = tz_offset_from_param
            filename = "#{Time.now.utc.strftime('%Y%m%d%H%M%S%Z')}_event_search.csv"
            if request.env['HTTP_USER_AGENT'] =~ /msie/i
                headers['Pragma'] = 'public'
                headers["Content-type"] = "text/plain"
                headers['Cache-Control'] = 'no-cache, must-revalidate, post-check=0, pre-check=0'
                headers['Content-Disposition'] = "attachment; filename=\"#{filename}\""
                headers['Expires'] = "0"
            else
                headers["Content-Type"] ||= 'text/csv'
                headers["Content-Disposition"] = "attachment; filename=\"#{filename}\""
            end

            render :template => "monitor/events/search.csv", :layout => false
            return
        end
        render :partial => "search"
    end

    # Post events to the main display.
    def post
        event_search
    end

    def fetch_events_since
        params[:ids] = Event.after(params[:time]).collect{|x| x.id}.join(',')
        event_search
        render :template => 'monitor/events/post'
    end

    def get_track_events
        count = Event.where(event_track_id: params[:eventTrackId].to_i).count

        opts = {}

        opts[:conditions] = {}
        opts[:conditions][Event.field_mappings['OwnerId'][:field]] = current_user.organization_ids
        opts[:conditions]['events.event_track_id'] = params[:eventTrackId].to_i

        # don't include tags, it may save db calls, but it messes up the custom select
        #opts[:include] = [:tags]  #include tags because the tag string will be saved on the javascript side

        if params[:limit].blank?
            @events = Event.select("events.*, ST_Y(events.location) AS latitude, ST_X(events.location) AS longitude").joins(Event.field_joins['OwnerId']).where(opts[:conditions]).order("time ASC")
        else
            opts[:limit] = params[:limit]
            opts[:offset] = params[:offset] || 0
            @events = Event.select("events.*, ST_Y(events.location) AS latitude, ST_X(events.location) AS longitude").joins(Event.field_joins['OwnerId']).where(opts[:conditions]).order("time ASC").limit(opts[:limit]).offset(opts[:offset])
        end

        @limit_reached = !opts[:limit].blank? && (count > (opts[:limit].to_i + params[:offset].to_i))
    end

  private

    # Search for events.
    def event_search
        opts = {}
        opts[:conditions] = {}
        opts[:conditions][Event.field_mappings['OwnerId'][:field]] = current_user.organization_ids
        opts[:conditions][Event.field_mappings['EventId'][:field]] = params[:ids].split(',')

        @events = Event.select("events.*, ST_Y(events.location) AS latitude, ST_X(events.location) AS longitude").joins(Event.field_joins['OwnerId']).where(opts[:conditions])
    end

    # Setup the menu.
    def setup_menu
        @menu = []
        @menu << {
            :name => 'fotechmenu',
            :submenu => [
                { :name => 'print', :label => I18n.t('admin.menu.fotech.print'), :url => 'javascript: window.print()', :disabled => true },
                {},
                { :label => I18n.t('common.menu.close_window'), :url => 'javascript: window.close()' }
            ]

        }
        #if not in portal include preferences menu item
        unless params[:portal_request]
            @menu[0][:submenu].unshift({ :label => I18n.t('admin.menu.fotech.preferences'), :url => 'javascript: window.opener.showPreferencesWindow()' })
        end
        @menu << {
            :name => 'viewmenu',
            :label => I18n.t('main.menu.view.title'),
            :submenu => [
                { :name => 'viewCriteria', :label => I18n.t('monitor.events.init_search.menu.view.criteria'), :url => "javascript: showCriteria()" },
                {},
                { :name => 'clear', :label => I18n.t('monitor.events.init_search.menu.view.clear'), :url => "javascript: clearSearchResults()", :disabled => true }
            ]
        }
        unless params[:portal_request]
            @menu << { :name => 'postToDisplay', :label => I18n.t('monitor.events.init_search.menu.post'), :url => "javascript: postSearchResultsToMainDisplay(eventIdsStr)", :disabled => true }
        end
    end

    # Search the repository based on the criteria form.
    def perform_search
    	
    	params.permit!
    	
        if params[:fibreLinesIds].nil?
            @global_fibre_lines = FibreLine.not_deleted.where(owner_id: current_user.organization_ids)
        else
            @global_fibre_lines = FibreLine.not_deleted.where(id: params[:fibreLineIds].split(','), owner_id: current_user.organization_ids)
        end
        @event_types = EventType.all #we want all rather than just the active ones
        opts = {}
        select = "events.*"
        select.concat(", ST_Y(events.location) AS latitude")
        select.concat(", ST_X(events.location) AS longitude")
        select.concat(",(select et.value from event_tags et where et.event_id = events.id and et.key = 'path_path_name') As path_name")
        select.concat(",(select et.value from event_tags et where et.event_id = events.id and et.key = 'path_distance') As path_distance")
        select.concat(",(select et.value from event_tags et where et.event_id = events.id and et.key = 'path_direction_of_travel') As path_direction")
        select.concat(",(select et.value from event_tags et where et.event_id = events.id and et.key = 'path_velocity') As path_velocity")

		event_list = Event.all.order('events.time DESC')
		event_list = event_list.select(select)
        mustLimit = (not params[:limit].blank?)
        if mustLimit
        	limit = params[:limit].to_i + 1
        	event_list = event_list.limit(limit)
        end

        if !params[:restrictToCurrentFibreLine]
        	event_list = event_list.where("fibre_line_id in (#{@global_fibre_lines.collect{|fl| fl.id}.join(", ")})")
        else
        	event_list = event_list.where("fibre_line_id = #{params[:currentLineId]}")
        end

        if params[:restrictToSpatialFilter]
            unless params[:spatialBounds].empty?
                geom = format_coordinates(params[:spatialBounds])
                coords = []
                geom.split(":").each { |coord|
                    ll = []
                    coord.split(",").each { |l| ll << l }
                    coords << "#{ll[1]} #{ll[0]}"
                }
                coords << coords[0]
                event_list = event_list.where("location @ ST_GeomFromText('POLYGON((#{coords.join(",")}))')")
            end
            unless params[:depthBounds].empty?
                bounds = params[:depthBounds].split(',')
                minBound = bounds[0]
                maxBound = bounds[1]
                event_list = event_list.where("position >= #{minBound} AND position <= #{maxBound}")
            end
        end

        if params[:restrictTime]
            minTime = Time.xmlschema(params[:startTimeXml]) rescue Time.at(0)  #time at epoch as earliest date
            maxTime = Time.xmlschema(params[:endTimeXml]) rescue Time.now.getutc
            event_list = event_list.where("time >= '#{minTime}' AND time <= '#{maxTime}'")
        end

        if params[:restrictId]
            unless params[:alertId].blank?
                event_list = event_list.where("alert_id = #{params[:alertId]}")
            end
            unless params[:eventId].blank?
                event_list = event_list.where("id = #{params[:eventId]}")
            end
        end


        if params[:restrictEventTypes]
            unless params[:selectedEventTypeIds].blank?
                event_type_ids = params[:selectedEventTypeIds].split(',')
                event_list = event_list.where("event_type_id in (#{event_type_ids.join(", ")})")
            end
        end

        if params[:restrictMagnitude]
            event_list = add_float_criteria(event_list, :minMagnitude, :maxMagnitude, "amplitude")
            event_list = add_float_criteria(event_list, :minWidth, :maxWidth, "width")
            event_list = add_float_criteria(event_list, :minVelocity, :maxVelocity, "velocity")
            event_list = add_float_criteria(event_list, :minAcceleration, :maxAcceleration, "acceleration")
        end

        if !params[:includeSuppressedEvents]
            event_list = event_list.where("is_suppressed = 'f'")
        end

        if params[:restrictByRoute]
          event_list = event_list.select{ |event| event.path_name == params["search"]["route_id"]} if params["search"] && !params["search"]["route_id"].blank?
          event_list = event_list.select{|event| event.path_direction && event.path_direction = params["search"]["route_direction"]} if params["search"] && !params["search"]["route_direction"].blank?
          event_list = event_list.select{ |event| event.path_distance && event.path_distance >= params["route_min_distance"]} unless params["route_min_distance"].blank?
          event_list = event_list.select{|event| event.path_distance && event.path_distance <= params["route_max_distance"]} unless params["route_max_distance"].blank?
          event_list = event_list.select{ |event| event.path_velocity&& event.path_velocity >= params["route_min_velocity"]} unless params["route_min_velocity"].blank?
          event_list = event_list.select{|event| event.path_velocity && event.path_velocity <= params["route_max_velocity"]} unless params["route_max_velocity"].blank?
        end
        @event_ids = event_list.collect {|e| e.id}

        if mustLimit and @event_ids.size > limit
            @overLimit = true
            @event_ids.delete_at(@event_ids.size - 1)
        end

        @events = []
        track_list = []
        event_list.each do |event|
            @events.push event and next if event.event_track_id.nil?
            unless track_list.include? event.event_track_id
                @events.push event_list.select {|e| e.event_track_id == event.event_track_id }
                track_list.push event.event_track_id
            end
        end
    end

    # Add a criteria to the search.
    def add_float_criteria(event_list, minParam, maxParam, field)
        if not params[minParam].blank?
            event_list = event_list.where("#{field} >= #{params[minParam].to_f}")
        end
        if not params[maxParam].blank?
            event_list = event_list.where("#{field} <= #{params[maxParam].to_f}")
        end
        return event_list
    end
end
