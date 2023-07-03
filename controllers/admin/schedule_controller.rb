# FILENAME:     schedule_controller
# AUTHOR:       Karina Simard
# CREATED ON:   2013-04-30
#
# DESCRIPTION:  Maintenance of alert suppressions schedules.
#
# LAST CHANGE:
# $Author: $
#   $Date: $
#    $Rev: $
#    $URL: $
#
# COPYRIGHT:
# This file is Copyright © 2010 Fotech Solutions Ltd. All rights reserved.
class Admin::ScheduleController < AdminController
    before_action :security_check, :basic_schedule_setup, :setup_menu

    def index
    end

    def show
        redirect_to "/admin/schedule/#{params[:id]}/edit?tz_offset=" + params["tz_offset"] + ""
    end

    def new
        redirect_to '/admin/schedule/0/edit/?tz_offset=' + params[:tz_offset] + ''
    end

    def create
    end

    def edit
        if params[:id] == '0'
            @schedule = Schedule.new
        else
            @schedule = Schedule.find(params[:id])
            start_date_time = Time.convert_UTC_to_local_time(@schedule.start_date, @schedule.start_time)
            end_date_time = Time.convert_UTC_to_local_time( @schedule.end_date, @schedule.end_time)
            repeat_ends_on_datetime = Time.convert_UTC_to_local_time(@schedule.repeat_ends_on, @schedule.end_time)
            @start_date = start_date_time.strftime("%Y-%m-%d")
            @end_date = end_date_time.strftime("%Y-%m-%d")
            @repeat_ends_on = repeat_ends_on_datetime.strftime("%Y-%m-%d")
            @start_time = start_date_time.strftime("%H:%M")
            @end_time = end_date_time.strftime ("%H:%M")
            @repeating_days = Time.convert_UTC_alarm_repeating_days_into_local(start_date_time.to_date, @schedule.start_date.to_date, @schedule.repeats_on)
        end

        @initial_map_type = APP_CONFIG['monitor']['initial_map_type']
        preference = Preference.where(user_id: current_user.id, key: 'initial-map-type').first
        @initial_map_type = preference.value if !preference.nil? && APP_CONFIG['monitor']['map_layers'].keys.include?(preference.value)

    	respond_to do |format|
        	format.html
		end
   end

    def update
        #save
        params.permit!
        @timezone = params[:timezone]
        @schedule = Schedule.find_by_id(params[:id]) || Schedule.new
        @schedule.attributes = params[:schedule]
        # if params[:schedule][:start_time] == ''
        #     @schedule.end_time = '00:00'
        # end
        # if params[:schedule][:end_time] == ''
        #     @schedule.end_time = '24:59'
        # end
        schedule_repeating = Schedule.is_repeating?(params["schedule"]["is_repeating"])
        start_date_time = Time.convert_local_to_UTC_time(params[:schedule]["start_date"], params[:schedule][:start_time])
        @schedule.start_date = start_date_time.strftime"%Y-%m-%d"
        if schedule_repeating
           repeat_ends_on_datetime = Time.convert_local_to_UTC_time(params[:schedule]["repeat_ends_on"], params[:schedule][:end_time])
           @schedule.repeat_ends_on = repeat_ends_on_datetime.strftime("%Y-%m-%d")
           @schedule.end_time = repeat_ends_on_datetime.strftime("%H:%M")
        else
           end_date_time = Time.convert_local_to_UTC_time(params[:schedule]["end_date"],params[:schedule][:end_time])
           @schedule.end_date = end_date_time.strftime("%Y-%m-%d")
           @schedule.end_time = end_date_time.strftime("%H:%M")
        end
        @schedule.start_time = start_date_time.strftime("%H:%M")
        @schedule.repeats_on = schedule_repeating ? Time.convert_local_time_zone_alarm_repeating_days_into_UTC(params[:schedule]["start_date"].to_date, @schedule.start_date.to_date, params[:repeating_days]) : ','
        @schedule.alarm_types = ','+params[:suppress_alerts].join(',')
        #render :text => "<pre>#{params.to_yaml}</pre>" and return



        if @schedule.save
            #save regions
            params[:new_regions] and params[:new_regions].each do |bounds|
                r = ScheduleRegion.create(:schedule_id => @schedule.id)
                r.update_bounds(bounds)
            end

            params[:regions] and params[:regions].keys.each do |r_id|
                bounds = params[:regions][r_id]
                r = ScheduleRegion.find(r_id);
                r.update_bounds(bounds)
            end

            #save exceptions
	    	params.keys.select{|x| x[/_schedule_exception_start$/]}.each do |key|
                ex_start = params[key]
                ex_end = params[key.gsub(/start$/, 'end')]
                ex_name = params[key.gsub(/start$/,'name')]
                if key[/_new/]
                    ex = ScheduleException.new(:schedule_id => @schedule.id)
                else
                    ex = ScheduleException.find_by_id(key.to_i)
                end
                ex.start_time = Time.zone.parse(ex_start).utc
                ex.end_time = Time.zone.parse(ex_end).utc
                ex.name = ex_name
                ex.save
            end

            redirect_to :action => 'index', :tz_offset => params[:tz_offset]
        else
        	render :action => 'edit', :tz_offset => params[:tz_offset]
        end
    end

    def destroy
        if params[:schedule_region_id]
            region = ScheduleRegion.find(params[:schedule_region_id])
            region.destroy
            render :text => 'region deleted'
        elsif params[:schedule_exception_id]
            ex = ScheduleException.find(params[:schedule_exception_id])
            ex.destroy
            render :text => 'exception deleted'
        else
            #destroy the whole schedule
            regions = ScheduleRegion.where(schedule_id: params[:id])
            regions.each{|r| r.destroy }
            ex = ScheduleException.where(schedule_id: params[:id])
            ex.each{|e| e.destroy}
            s = Schedule.find(params[:id])
            s.destroy

            redirect_to :action => 'index', :tz_offset => params[:tz_offset]
        end
    end

  private
    # Perform our permissions checks and throw and exception if they fail.
    def security_check
    #    security_breach unless can? :maintain, :schedules
    end

    def setup_menu
        @menu = setup_admin_menu
    end


    # TODO: Reduce duplicate code used for partial => 'monitor/fibre_lines/fibre_lines':
    # Code in markers_controller, shcedule_controller, main_controller, and portal_controller
    # should be refactored and put into a common location. I have not done that now as an even
    # better solution would be to refactor the map display to be a "partial" that could
    # be included in all the pages where a map would be useful.
    # See issue #17978.
    def basic_schedule_setup
        @global_fibre_lines = FibreLine.with_geometry.where(owner_id: current_user.organization_ids).order("upper(name)")
        @activeRanges = {}
        @global_fibre_lines.each { |fl| @activeRanges[fl.id] = fl.compute_active_range() }
        active_event_types = EventType.get_active
        @alert_types_description = EventType.get_event_type_description(active_event_types)
        @alert_types = active_event_types.select{|x| x.name != 'fibre_break'}.collect{|x| x.name + "_alert"}

		heliosUnitIds = Set.new
		@global_fibre_lines.each { |fl| heliosUnitIds << fl.helios_unit_id if fl.helios_unit_id }
		heliosUnitIds = heliosUnitIds.to_a

		heliosUnits = []
		if heliosUnitIds.any?
			heliosUnits = HeliosUnit.where(id: heliosUnitIds)
		end
		@helios_data = {}
		heliosUnits.each do |helios|
			@helios_data[helios.id] = helios
		end

    end
end
