# FILENAME:     alerts_controller.rb
# AUTHOR:       Steven Klassen
# CREATED ON:   2010-08-0e
#
# DESCRIPTION:  Maintenance of alerts.
#
# LAST CHANGE:
# $Author$
#   $Date$
#    $Rev$
#    $URL$
#
# COPYRIGHT:
# This file is Copyright © 2010 Fotech Solutions Ltd. All rights reserved.


class Admin::AlertsController < AdminController
    before_action :security_check

    # List all the outstanding alerts.
    def index
        @regions = FibreRegion.get_accessible_regions(current_user.id)
        if params[:portal_request]
            @menu = setup_portal_menu
        else
            @menu = setup_menu
        end
        @title = I18n.t('admin.alerts.title')
        @showAll = (params[:show_all] == 'true' ? true : false)
        @showSearchDialog = !params[:search].nil?
        @alert_types = Alert.alert_types + EventType.get_active.collect{|type| "#{type.name}_alert"}
        @csv_link = request.fullpath.gsub(/\/alerts\??/, '/alerts.csv?')
        @alerts_require_comment_text = SystemPreference.alerts_require_comment_text?
        @paths_all = Path.get_system_paths(current_user.organization_ids)
        @distance_units = get_preference('units-distance')[:value]
        @distance_precision = get_preference('precision-distance')[:value]
        @velocityUnit = get_preference('units-velocity')[:value]
        @velocityPrecision = get_preference('precision-velocity')[:value]
        paths = Path.not_deleted.where(organization_id: current_user.organization_ids).select("name, label_towards, label_away").order("name")
        @required_path_hash = {}
        paths.each{|path|
             @required_path_hash[path.name] ||= []
             @required_path_hash[path.name] << path.label_towards
             @required_path_hash[path.name] << path.label_away
             @required_path_hash[path.name].uniq!
        }

        params[:limit]  = params[:limit] || 50
        params[:offset] = params[:offset] || 0

        # Disable offsetting and limiting for CSV downloads, which should
        # contain all the applicable data
        if params[:format] == 'csv'
            params[:limit] = 50000
            params[:offset] = 0
        end

        logger.info "alert_report: limit #{params[:limit]}"
        logger.info "alert_report: offset #{params[:offset]}"

        if params[:search]
            params[:limit]  = params[:limit] || params[:search]['limit'] || 50
            params[:offset] = params[:offset] || params[:search]['offset'] || 0

            @alerts = search_alerts_results
            @no_alert_message = I18n.t('admin.alerts.no_search_results')
            params[:search]['status'] ||= []
            params[:search]['name'] ||= []
            params[:search]['threat_level'] ||= []
        else
            params[:search] ||= {}
            params[:search]['status'] ||= []
            params[:search]['name'] ||= []
            params[:search]['threat_level'] ||= []

            @alerts = Alert.with_recent_times.where(compute_alert_conditions(:includeResolved => @showAll)).order(:time).includes(:alert_details).offset(params[:offset]).limit(params[:limit])

            @no_alert_message = I18n.t('admin.alerts.none_outstanding')
        end

        set_regions(@alerts)

        if params[:format] == 'html'
            render :layout => "admin"
            return
        elsif params[:format] == 'csv'
            @tz_offset = tz_offset_from_param
			@preferences_hash = get_preferences_as_hash_with_defaults

            filename = "#{Time.now.utc.strftime('%Y%m%d%H%M%S%Z')}_alarm_search.csv"
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

            render :template => 'admin/alerts/search_results.csv', :layout => false
            return
        end
    end

    # Show a specific alert.
    def show
        begin
            # Check to see if we have been given a huge list of IDs rather than one
            # specific ID
            respond_to do |format|
              format.html {
                @showResolvedAlerts = true
                redirect_to '/html/panel.html?panel=' + params[:id]#, status: :moved_permanently
                return
              }
              format.json {
                  # Carry on ...
              }
            end

            if ( params[:ids] )
                @ids = params[:ids].map { | id | id.to_i }

                @alerts = Alert.with_status.where(id: @ids).where(compute_alert_conditions({:includeResolved => true, :includeSuppressed => true}))

                @alerts.each do | alert |
                    alert.append_extra_json_variables

                    # If the alert contains path details, create two "onroute" items.
                    set_alert_onroute_info(alert)
                end

                render :json => @alerts.to_json(include: :alert_responses)
                return
            else
                @alert = Alert.with_status.where(id: params[:id].to_i).where(compute_alert_conditions({:includeResolved => true, :includeSuppressed => true})).first

                @alert.append_extra_json_variables

                # If the alert contains path details, create two "onroute" items.
                set_alert_onroute_info(@alert)

                @title = I18n.t('admin.alerts.show.title', :name => I18n.t("alert.name.#{@alert.name}"))
                @alerts_require_comment_text = SystemPreference.alerts_require_comment_text? && @alert.status == 'new'
            end

            @suppressUser = true
            @forceCentre = (params[:centre] and params[:centre] == 'true' ? true : false)
            @preferences_hash = get_preferences_as_hash_with_defaults

            # Determine the format to write the response in
            if ( params[:format] == 'json' )
                render :json => @alert.to_json(include: :alert_responses)
                return
            end

            @sorted_alerts = @alert.alert_responses.sort{ |a,b| a.time <=> b.time }

            respond_to do |format|
              format.html {
                @showResolvedAlerts = true
                redirect_to '/html/panel.html?panel='# + params[:id]#, status: :moved_permanently
return
                render :layout => "admin"
              }
              format.json {
                  render :json => @alert.to_json(include: :alert_responses)
              }
              format.js   {
                @showResolvedAlerts = false
                render :partial => 'alert_details'
                # First, convert all the details into something a little more sane, stip away the cruft.
#                render :json => @alert.to_json(:include => :alert_responses)
              }
            end
        rescue ActiveRecord::RecordNotFound => ex
            log_exception ex
            logger.error "Alert #{params[:id]} was not found"
            render :text => "Alert #{params[:id]} was not found", :status => 404
        end
    end

    def fetch_full_alert
        begin
            @alert = Alert.with_status.where(compute_alert_conditions(:includeResolved => true)).find_by(params[:id].to_i)
            @alert.append_extra_json_variables
            ignore = AlertConfiguration.where(alert_type: @alert.name, key: 'ignore').first
            ignore = ignore ? ignore.value == 'true' : false
            if ignore
               render :text => 'ignore this alert'
               return
            end
        rescue ActiveRecord::RecordNotFound => ex
            log_exception ex
            @alert = nil
            @failedAlertId = params[:id]
        end
    end

    def fetch_outstanding_alerts
        @alert = Alert.with_status.where(compute_alert_conditions)
        @alert.each {|x| x.append_extra_json_variables}
        render :template => "admin/alerts/fetch_full_alert.js"
    end

    def fetch_alerts_since
        time = params[:time]
        @alert = Alert.after(time).with_status.where(compute_alert_conditions(:includeResolved => true))
        @alert.each {|x| x.append_extra_json_variables}
        render :template => "admin/alerts/fetch_full_alert.js"
    end

    # Delete an existing alert.
    def destroy
        security_breach unless can? :manage, :alerts
        begin
        	ids = params[:id].split(',').collect{|x| x.to_i }
            Alert.respond_delete_for_threats(ids)
            
            # Attempting to mitigate issue #22737
            batch_size = 50
            ids.each_slice(batch_size) do | batch |
            	Alert.transaction do
                	AlertResponse.where(alert_id: batch).delete_all
                	AlertDetail.where(alert_id: batch).delete_all
                	Alert.where(id: batch).destroy_all
            	end
            end

            @error = nil
            @id = params[:id]
        rescue => ex
            log_exception ex
            @error = ex
        end
        render :template => "/admin/destroy.js"
    end

    # Add a response to an alert.
    def add_response
        security_breach unless can? :acknowledge, :alerts
        begin
            @dialogId = 'response_dialog'
            alert_id_list_local = params[:alert_id].split(',');

            @alert_id_list = []
            alert_id_list_local.each { |x| @alert_id_list.push( x.delete_prefix('local_') ) }

            alert_list = []
            Alert.transaction do
                # We might have lists of alarms by ID or by UUID, we need to resolve that into
                # a single list given by a ID for the purposes of this operation.

                id_alert_list = Alert.where(id: @alert_id_list)

                # The above list will have given us a list of Alerts by ID, now if we discover
                # the list via UUID and then extrapolate the IDs from them.
                alert_uuid_list = Alert.where( uuid: @alert_id_list )

                # Clear out the list of alerts and ids so we can rebuild them
                @alert_id_list = []
                alert_list = []

                id_alert_list.each do | a |
                    @alert_id_list.append( a.id )
                    alert_list.append( a )
                end

                alert_uuid_list.each do | a |
                    @alert_id_list.append( a.id )
                    alert_list.append( a )
                end

                #security checks for all of them first
                alert_list.each do |a|
                    security_breach unless ((params[:response] == 'acknowledge') or (can? :respond, :alerts))
                    security_breach unless (has_role? :system_admin or ((a.organization_id == nil) or (current_user.organization_ids.include? a.organization_id)))
                end

                comment = params[:comments]
                if params[:comment_tag]
                    comment = "(#{params[:comment_tag]}) " + comment
                end

                i = 0
                alert_list.each do |a|
                    a.respond(params[:response], "#{@alert_id_list[i]}", comment, current_user)
                    i += 1
                end
                @shouldClose = (params[:response] == 'resolve')
            end

            # build the list of threat ids to resolve
            i = 0
            ids = []
            alert_list.each do |a|
                ids.push(@alert_id_list[i])
                i += 1
            end

            # resolve the threats here
            a = alert_list.first
            if params[:response] == 'resolve'
                a.respond_resolve_for_threats(ids)
            end

            # Use the alert engine to ensure any necessary updates take place. Note that this
            # must take place after the end of the transaction to ensure that any processes
            # receiving the alert can obtain up to date information from the DB.
            alert_list.each do |a|
                eng = AlertEngine.new(a.id, logger)
                eng.process_merged_alert
            end

        rescue => ex
            log_exception ex
            @error = ex
        end

    end

    def alert_report
        @regions = FibreRegion.get_accessible_regions(current_user.id)
        @preferences_hash = get_preferences_as_hash_with_defaults
        @include_details = params[:include_details]
        @tz_offset = tz_offset_from_param
        @user_names = {}
        User.all.each { |u| @user_names[u.id] = u.fullname }
        @alert_groups = {}
        @paths_all = Path.get_system_paths(current_user.organization_ids)
        @distance_units = get_preference('units-distance')[:value]
        @distance_precision = get_preference('precision-distance')[:value]

        @startTime
        @endTime
        offset_time = Time.zone_offset(Time.tz_offset_mins_to_hhmm(@tz_offset))

        # New style reports have different criteria for start and end times
        # and is designed to be "simpler"

        if ( !params[:type].nil? )
            if ( !params[:duration].nil? )
                if ( params[:duration] == 'daily' )
                    @endTime = Time.now.utc
                    # @startTime = ((@endTime + offset_time) - offset_time - 24.hours).beginning_of_day
                    @startTime = (@endTime + offset_time).beginning_of_day - offset_time - 24.hours
                elsif( params[:duration] == 'monthly' )
                    @endTime = Time.now.utc.end_of_day
                    @startTime = @endTime.beginning_of_month
                end
            end
        end

        params[:limit]  = params[:limit] || 50
        params[:offset] = params[:offset] || 0

        if params[:search]
            params[:limit]  = params[:limit] || params[:search]['limit'] || 50
            params[:offset] = params[:offset] || params[:search]['offset'] || 0

            @showAll = params[:show_all] == 'true'
            if params[:search] == ''
logger.info( "Running a new search" )
                alerts = Alert.with_recent_times.where(compute_alert_conditions(:includeResolved => @showAll)).includes(:alert_details).order(:time).limit(params[:limit]).offset(params[:offset])
            else
logger.info( "Running search alerts results" )
                alerts = search_alerts_results
            end
            set_regions(alerts)
            alerts.each do |alert|
                set_alert_onroute_info(alert) unless @paths_all.blank?
            end
            @alert_groups['Alerts'] = { :alerts => alerts }
        else
            if ( @endTime.nil? )
                @endTime = Time.now.utc
            end
            if ( @startTime.nil?)
                @startTime = (@endTime + offset_time).beginning_of_day - offset_time - 24.hours
            end

            logger.info "alert_report: #{@endTime}"
            logger.info "alert_report: #{@startTime}"
            @daily_alerts = Alert.with_recent_times.where(time: @startTime..@endTime).includes(:alert_details).order('time ASC')
            set_regions(@daily_alerts)
            @daily_alerts.each do |alert|
                set_alert_onroute_info(alert) unless @paths_all.blank?
            end

            @outstanding_alerts = Alert.with_recent_times.where(compute_alert_conditions(:includeAcknowledged => false)).includes(:alert_details).order('time ASC')
            set_regions(@outstanding_alerts)
            @outstanding_alerts.each do |alert|
                set_alert_onroute_info(alert) unless @paths_all.blank?
            end

            @alert_groups[I18n.t('admin.alert_report.daily.title')] = {:alerts => @daily_alerts, :start_time => @startTime, :end_time => @endTime}
            @alert_groups[I18n.t('admin.alert_report.outstanding.title')] = {:alerts => @outstanding_alerts}
        end

        # Derive what we want to do based upon a type variable, we might want chainage reports etc.
        # Set the default rendering options

        if ( !params[:type].nil? )
            @section = ''
            @data = ''

            @override = []

            if ( params[:type] == 'alarmcount' )
                # Generate the alarmcount report
                @data, @section = alarmcount( alerts || @daily_alerts,  @startTime, @endTime )
            end

            if ( params[:type] == 'alarmlist' )
                # Generate the alarmcount report
                @data, @section = alarmlist( alerts || @daily_alerts )
#                @section = 'debug'
            end

            if ( params[:type] == 'repeatedalarms' )
                # Generate the alarmcount report
                @data, @section = repeatedalarms( alerts || @daily_alerts )
                @override = [ 'search[threat_level][]', 'search[threshold]' ]
#                @section = 'debug'
            end

            filename = "#{Time.now.utc.strftime('%Y%m%d%H%M%S%Z')}_alarm_report.csv"

            respond_to do |format|
                format.html {render :template => 'admin/alerts/reports/report' }
                format.csv {
                    headers['Content-Disposition'] = "attachment; filename=\"#{filename}\""
                    render :template => 'admin/alerts/reports/report.csv'
                }
                format.text
            end

            return
        end

        respond_to do |format|
            format.html { render :layout => false }
            format.text
        end
    end

    def resolve_all

        alert_name = params[:alert_name]
        conditions = {'time_resolved' => nil}
        if alert_name
            conditions['name'] = alert_name
        end
        alerts = Alert.where(conditions)
        alerts.each { |a|
            a.respond('resolve', a.id, "i18n: alert.comments.resolved_via_resolve_all", current_user)
            ae = AlertEngine.new(a.id, logger)
            ae.process_merged_alert()
        }

        if (not alert_name) or (alert_name == 'fibre_break_alert')
            # Just in case there are fibre breaks marked but no fibre break alert active,
            # we clear any fibre break positions.
            FibreLine.resolve_all_fibre_breaks(current_user.id)
        end

        render :text => ''
    end

  private

     def set_regions(alerts)
         alerts.each do |a|
             a.class.module_eval { attr_accessor :regions}
             regions = a.detail 'in_region_user'
             regions = regions.nil? ? [] : regions.split(',')
             a.regions = regions
             a.extra_regions = regions
         end
     end


    # Perform our permissions checks and throw and exception if they fail.
    def security_check
        security_breach unless can? :read, :alerts
    end

	def fix_datetime_string(d)
		if not d.nil? and d.length >= 20 and d[19,1] == ' '
			d[19,1] = '+'
		end
		return d
	end

    def search_alerts_results
        scope = Alert
        if not has_role? :system_admin
            scope = scope.where(organization_id: nil).or(scope.where(organization_id: current_user.organization_ids))
        end

        puts params.inspect
        search_params = params[:search].clone
        if params[:include_id] == "1" and search_params[:alert_id].to_i != 0
            return scope.with_recent_times.where(id: search_params[:alert_id])  #return an array
        end

        status = search_params.delete 'status'
        name = search_params.delete 'name'
        threat_level = search_params.delete 'threat_level'

        start_time = params['start_time']
        end_time = params['end_time']
        start_time_xml = Time.xmlschema(fix_datetime_string(params[:search][:startTimeXml])) unless start_time.blank?
        end_time_xml = Time.xmlschema(fix_datetime_string(params[:search][:endTimeXml])) unless end_time.blank?

        include_suppressed = params[:search][:include_suppressed] == '1'
        include_route = params[:include_route] == '1'

        order_by = search_params.delete 'order_by'
        order_dir = search_params.delete 'order_dir'


        scope = scope.where(name: name) if name
        scope = scope.where(threat_level: threat_level) if threat_level

        if !include_suppressed
            scope = scope.conditions "is_suppressed = 'f'"
        end

        status_function = "(case when (time_resolved is not null) then 'resolved' when (time_acknowledged is not null) then 'acknowledged' else 'new' end)"
        scope = scope.where("#{status_function} in (?)", status) if status

        if start_time.blank? and end_time.blank?
            #so do nothing
        else
            start_time_xml = Time.at(0) if start_time_xml.blank?
            end_time_xml = 5.days.from_now.utc if end_time_xml.blank?
            scope = scope.where(time: start_time_xml..end_time_xml)
        end

        params[:limit]  = params[:limit] || params[:search]['limit'] || 50
        params[:offset] = params[:offset] || params[:search]['offset'] || 0

        if !order_by.blank?
            alerts = scope.with_recent_times.all.order("#{order_by} #{order_dir}, id asc").offset(params[:offset]).limit(params[:limit])
        else
            alerts = scope.with_recent_times.all.offset(params[:offset]).limit(params[:limit])
        end
        path_name = search_params.delete 'route_id'
        path_direction = search_params.delete 'route_direction'
        path_min_distance = search_params.delete 'route_min_distance'
        path_max_distance = search_params.delete 'route_max_distance'
        path_min_velocity = search_params.delete 'route_min_velocity'
        path_max_velocity = search_params.delete 'route_max_velocity'
        if include_route
          alerts = alerts.select{ |alert| alert.path_name == path_name} unless path_name.blank?
          alerts = alerts.select{|alert| alert.path_direction && alert.path_direction == path_direction} unless path_direction.blank?
          alerts = alerts.select{ |alert| alert.path_distance && alert.path_distance >= path_min_distance} unless path_min_distance.blank?
          alerts = alerts.select{|alert| alert.path_distance && alert.path_distance <= path_max_distance} unless path_max_distance.blank?
          alerts = alerts.select{ |alert| alert.path_velocity&& alert.path_velocity >= path_min_velocity} unless path_min_velocity.blank?
          alerts = alerts.select{|alert| alert.path_velocity && alert.path_velocity <= path_max_velocity} unless path_max_velocity.blank?
        end
        return alerts;
    end

    def setup_menu
        menu = setup_admin_menu
        menu << alert_view_menu
        menu << alert_search_menu
    end

    def setup_portal_menu
        menu = []
        menu << {
            :name => "fotechmenu",
            :submenu => [
                { :label => I18n.t('admin.menu.fotech.print'), :url => 'javascript: window.print()' },
                {},
                { :label => I18n.t('common.menu.close_window'), :url => 'javascript:window.close()' }
            ]
        }
        menu << alert_view_menu
        menu << alert_search_menu
    end

    def alert_view_menu
        prefix = params[:portal_request] ? '/portal/alert_report' : '/admin/alerts/alert_report'
        show_all = params[:show_all] == 'true'
        {
            :name => 'viewmenu',
            :label => I18n.t('main.menu.view.title'),
            :submenu => [
                { :name => 'clear', :label => I18n.t('admin.alerts.common.show_all'), :url => "javascript: window.location = window.location.pathname + " + (show_all ? "''" : "'?show_all=true'"), :checked => show_all },
                { :name => 'show_report', :label => I18n.t('admin.alerts.menu.show_report'), :url => "javascript: childWindows.registerChild('alert_report', window.open('#{prefix}?tz_offset=' + new Date().getTimezoneOffset(), 'Alert report'));"},
                { :name => 'show_report_wth_details', :label => I18n.t('admin.alerts.menu.show_report_with_details'), :url => "javascript: childWindows.registerChild('alert_report', window.open('#{prefix}?include_details=true&tz_offset=' + new Date().getTimezoneOffset(), 'Alert report'));"},
                { :name => 'show_daily_alarm_count', :label => I18n.t('admin.alerts.menu.show_daily_alarm_count'), :url => "javascript: childWindows.registerChild('alert_report', window.open('#{prefix}?include_details=true&type=alarmcount&duration=daily&tz_offset=' + new Date().getTimezoneOffset(), 'Alert report'));"},
                { :name => 'show_monthly_alarm_count', :label => I18n.t('admin.alerts.menu.show_monthly_alarm_count'), :url => "javascript: childWindows.registerChild('alert_report', window.open('#{prefix}?include_details=true&type=alarmcount&duration=monthly&tz_offset=' + new Date().getTimezoneOffset(), 'Alert report'));"},
                { :name => 'show_daily_alarm_list', :label => I18n.t('admin.alerts.menu.show_daily_alarm_list'), :url => "javascript: childWindows.registerChild('alert_report', window.open('#{prefix}?include_details=true&type=alarmlist&duration=daily&tz_offset=' + new Date().getTimezoneOffset(), 'Alert report'));"},
                { :name => 'show_monthly_alarm_list', :label => I18n.t('admin.alerts.menu.show_monthly_alarm_list'), :url => "javascript: childWindows.registerChild('alert_report', window.open('#{prefix}?include_details=true&type=alarmlist&duration=monthly&tz_offset=' + new Date().getTimezoneOffset(), 'Alert report'));"},

                # Repeat alarams
                { :name => 'show_daily_alarm_repeatalarms', :label => I18n.t('admin.alerts.menu.show_daily_repeatalarms'), :url => "javascript: childWindows.registerChild('alert_report', window.open('#{prefix}?include_details=true&type=repeatedalarms&duration=daily&search%5Bthreat_level%5D%5B%5D=red&search%5Bthreat_level%5D%5B%5D=amber&search%5Bthreat_level%5D%5B%5D=green&tz_offset=' + new Date().getTimezoneOffset(), 'Alert report'));"},
                { :name => 'show_monthly_alarm_repeatalarms', :label => I18n.t('admin.alerts.menu.show_monthly_repeatalarms'), :url => "javascript: childWindows.registerChild('alert_report', window.open('#{prefix}?include_details=true&type=repeatedalarms&duration=monthly&search%5Bthreat_level%5D%5B%5D=red&search%5Bthreat_level%5D%5B%5D=amber&search%5Bthreat_level%5D%5B%5D=green&tz_offset=' + new Date().getTimezoneOffset(), 'Alert report'));"},

                { :name => 'show_current_report', :label => I18n.t('admin.alerts.menu.show_current_report'), :url => "javascript: childWindows.registerChild('alert_report', window.open('#{prefix}?tz_offset=' + new Date().getTimezoneOffset() + '&#{request.query_string}', 'Alert report'));"},
                { :name => 'show_current_report_wth_details', :label => I18n.t('admin.alerts.menu.show_current_report_with_details'), :url => "javascript: childWindows.registerChild('alert_report', window.open('#{prefix}?include_details=true&tz_offset=' + new Date().getTimezoneOffset() + '&#{request.query_string}', 'Alert report'));"}
            ]
        }
    end

    def alert_search_menu
        { :name => 'search', :label => I18n.t('admin.alerts.menu.search'), :url => "javascript: admin.alerts.showAlertSearchDialog()"}
    end


    def set_alert_onroute_info(alert)
        alert.on_route_info = ""
        unless alert.detail("path_path_id").nil?
            distanceUnit = get_preference('units-distance')[:value]
            distancePrecision = get_preference('precision-distance')[:value]
            velocityUnit = get_preference('units-velocity')[:value]
            velocityPrecision = get_preference('precision-velocity')[:value]
            on_route = alert.get_on_route_info(distanceUnit, distancePrecision, velocityUnit, velocityPrecision)
            alert.on_route_info = on_route
            #alert.get_on_route_info(distanceUnit, distancePrecision, velocityUnit, velocityPrecision)
        end
    end

    def alarmcount( alerts, startTime, endTime )
        # The daily count shows the total number of alerts received, per region per day
        # This is nominally based upon a particular month, so we should try to take that
        # into account, if no date is given we can default to now, even though
        # we will only ever see partial results.

        data = {};

        # Having now retrieved our data, we should iterate through it and place it in the
        # correct places.

        allregions = {}

        alerts.each do | alert |
            # Determine which regions are affected, defaulting if there are none
            regions = alert.extra_regions
            if ( regions.nil? || regions.length == 0 )
                regions = [ 'default' ]
            end

            regions.each do | region |
                allregions[region] = true
                # now we should parse the alert's date, and add it to the appropriate counts
                created = alert[:time]
                created = created.to_datetime

                # Keep track of the earliest and latest events so we can correctly include
                # the entire date range when required.
                if ( startTime.nil? || startTime > created )
                    startTime = created.at_beginning_of_day
                end

                if ( endTime.nil? || endTime < created )
                    endTime = created.end_of_day
                end

                created = created.to_date

                if ( data[ region ].nil? )
                    data[ region ] = {}
                end

                if ( data[ region ][ created ].nil? )
                    data[ region ][ created ] = 0
                end

                # Do we want to avoid counting this entry (is it severe enough?)
                data[ region ][ created ] += 1
            end
        end

        allregions.each do | region, spluff |
            # Check that this region is defined correctly, this will compensate for
            # alerts containing regions we haven't seen before
            if ( data[region].nil? )
                data[region] = {}
            end

            (startTime.to_date..endTime.to_date).each do | date |
                if ( data[ region ][ date ].nil? )
                    data[region][ date ] = 0
                end
            end
        end


        # return alerts, 'show'  # DEBUG

        return data, 'alarmcount'
    end

    def alarms( alarms )
        # Having now retrieved our data, we should iterate through it and place it in the
        # correct places.

        alarms.each do | alarm |
            alarm.append_extra_json_variables()
            alarm.position = alarm.detail('position')
        end
    end

    def alarmlist( alarms )
        alarms( alarms );

        return alarms, 'alarmlist'
    end

    def repeatedalarms( alarms )
        # Get the list of alarms, and then group them together ..
        alarms( alarms );

        repeated = {};

        alarms.each do | alarm |
            # Construct a list of repeated alarms, those are alarms which happen in the same
            # location (or patch), which is a 100m segment of the path.
            path     = ( alarm.detail('path_distance').nil? ? 0 : alarm.detail('path_distance').gsub( /^([^\d]+)/, '' ).to_f )
            position = ( alarm.detail('position').nil? ? 0 : alarm.detail('position').gsub( /^([^\d]+)/, '' ).to_f )

            patch = ( ( path * 1000 ) / 100 ).floor

            logger.info( alarm.inspect )
            logger.info( "Parsing alert at #{path} #{patch} - #{position}")

            alarm_type = alarm[:name]

            identifier = "#{alarm_type}::#{patch}"

            if ( repeated[identifier].nil? )
                repeated[identifier] = {
                    :threat_level  => [], #alarm[:threat_level],
                    :description   => alarm.description,
                    :patch         => patch,
                    :path_distance => [],
                    :path_marker   => [],
                    :position      => [],
                    :id            => [],
                    :frequency     => 0,
                    :oldest_event_time => [],
                    :newest_event_time => [],
                    :green_time        => [],
                    :amber_time        => [],
                    :red_time          => [],
                    :time_acknowledged => [],
                    :time_resolved     => [],
                    :alert_responses   => []
                }
            end
            repeated[identifier][:threat_level] << alarm[:threat_level]
            repeated[identifier][:id] << alarm[:id]
            repeated[identifier][:path_distance ] << alarm.detail('path_distance')
            repeated[identifier][:path_marker ]   << alarm.detail('path_marker_name')
            repeated[identifier][:position      ] << alarm.detail('position')
            repeated[identifier][:frequency ] = repeated[identifier][:frequency] + 1
            repeated[identifier][:oldest_event_time ] << alarm[:oldest_event_time]
            repeated[identifier][:newest_event_time ] << alarm[:newest_event_time]
            repeated[identifier][:green_time        ] << alarm[:green_time]
            repeated[identifier][:amber_time        ] << alarm[:amber_time]
            repeated[identifier][:red_time          ] << alarm[:red_time]
            repeated[identifier][:time_acknowledged ] << alarm[:time_acknowledged]
            repeated[identifier][:time_resolved     ] << alarm[:time_resolved]
            repeated[identifier][:alert_responses   ] << alarm.alert_responses
        end

       # return repeated, 'debug'

        return repeated, 'repeatedalarms'
    end


end

