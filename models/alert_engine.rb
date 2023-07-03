# FILENAME:     alert_engine.rb
# AUTHOR:       Steven Klassen
# CREATED ON:   2010-08-19
#
# DESCRIPTION:
#
# LAST CHANGE:
# $Author$
#   $Date$
#    $Rev$
#    $URL$
#
# COPYRIGHT:
# This file is Copyright © 2010 Fotech Solutions Ltd. All rights reserved.

require 'socket'
require 'date'


# This class provides alert based business logic that goes beyond what we wish to store
# in a simple model.
class AlertEngine

    # Create an engine for dealing with the specified alert.
    def initialize(alertId, logger=RAILS_DEFAULT_LOGGER)
        @alert = Alert.find(alertId)
        @logger = logger
    end

    # Process an incoming alert. At this point the alert will have been saved in the database.
    def process_incoming_alert()
        @logger.debug "ALERT_ENGINE::PROCESS_INCOMING_ALERT #{@alert.id}, #{@alert.name} at #{Time.new()}"
        append_computable_details(@alert)

        if self.respond_to? "process_incoming_alert_of_type_#{@alert.name}", true
            self.send("process_incoming_alert_of_type_#{@alert.name}", @alert)
        end

        if @alert.is_suppressed
            @logger.debug "SUPPRESSED >> ALERT_ENGINE::PROCESS_INCOMING_ALERT #{@alert.id}, #{@alert.name} at #{Time.new()}"
        else
            send_alert_notification(@alert)
            send_alert_notification_email(@alert)
        end
    end

    # Call the generate listeners for an alert.
    def call_generate_listeners
        if @alert.is_suppressed
            @logger.debug "SUPPRESSED >> ALERT_ENGINE::CALL_GENERATE_LISTENERS on #{@alert.id} at #{Time.new()}"
        else
            @logger.debug "ALERT_ENGINE::CALL_GENERATE_LISTENERS on #{@alert.id} at #{Time.new()}"
            @alert.call_generate_listeners(@logger)
        end
    end

    # Process an alert that has just been escalated.
    def process_escalated_alert
        @logger.debug "ALERT_ENGINE::PROCESS_ESCALATED_ALERT #{@alert.id}, #{@alert.name} at #{Time.new()}"

        if self.respond_to? "process_escalated_alert_of_type_#{@alert.name}", true
            self.send("process_escalated_alert_of_type_#{@alert.name}", @alert)
        end

        if(@alert.is_suppressed)
            @logger.debug "SUPPRESSED >> ALERT_ENGINE::PROCESS_ESCALATED_ALERT #{@alert.id}, #{@alert.name} at #{Time.new()}"
        else
            send_alert_notification(@alert)
            send_alert_notification_email(@alert, 'escalated')
        end
    end

    # Process an alert that has been merged or modified in some unknown manner.
    def process_merged_alert
        @logger.debug "ALERT_ENGINE::PROCESS_MERGED_ALERT #{@alert.id}, #{@alert.name} at #{Time.new()}"

        if self.respond_to? "process_merged_alert_of_type_#{@alert.name}", true
            self.send("process_merged_alert_of_type_#{@alert.name}", @alert)
        end

        if(@alert.is_suppressed)
            @logger.debug "SUPPRESSED >> ALERT_ENGINE::PROCESS_MERGED_ALERT #{@alert.id}, #{@alert.name} at #{Time.new()}"
        else
            send_alert_notification(@alert)
            if @alert.is_resolved?
                send_alert_notification_email(@alert)
            end
        end
    end

    # Call the respond listeners for an alert. We assume that the new response is the
    # most recent one, we we need to find it.
    def call_respond_listeners
        if @alert.is_suppressed
            @logger.debug "SUPPRESSED >> ALERT_ENGINE::CALL_RESPOND_LISTENERS on #{@alert.id} at #{Time.new()}"
        else
            r = @alert.alert_responses.last
            if not r.nil?
                @logger.debug "ALERT_ENGINE::CALL_RESPOND_LISTENERS on #{@alert.id} at #{Time.new()}"
                @alert.call_respond_listeners(r, @logger)
            end
        end
    end

  private

    #-----------------process incoming alerts based on type---------------------

    ## Processing alerts where name is fibre_break
    ## this assumes the fibre line id is assigned to the alert
    ## and position is present in the alert details
    def process_incoming_alert_of_type_fibre_break_alert(alert)
        details = details_hash(alert)
        broken_fibre = FibreLine.find(details['fibre_line_id'])
        position = details['position'].to_f
        broken_fibre.break_position = position
        position = position - 2.5
        if (position < 0)
            position = 0
        end
        broken_fibre.save
    end

    #-----------------process merged alerts based on type---------------------
    def process_merged_alert_of_type_fibre_break_alert(alert)
        # Recovery code should only run if alert is marked as resolved
        return unless alert.is_resolved?

        details = details_hash(alert)
        broken_fibre = FibreLine.find(details['fibre_line_id'])

        #clear the break
        broken_fibre.break_position = nil
        broken_fibre.save
    end

    # Add a detail to an alert and the hash.
    def _add_detail(alert, detailHash, detail)
        alert.alert_details << detail
        detailHash[detail.key] = detail.value
    end

    def _update_detail(alert, detailHash, detail)
        alert.update_detail(detail.key, detail.value, detail.visible)
        detailHash[detail.key] = detail.value
    end

    # Append any details we can compute from the system.
    def append_computable_details(alert)
        details = details_hash(alert)

        # If we have a fibre_line_id, then we may be able to add a location.
        if details.has_key? 'fibre_line_id'
            fibre = FibreLine.with_geometry.find(details['fibre_line_id'].to_i)

            # TODO: This condition looks wrong.
            if !details.has_key? 'position'
                pnt = fibre.fibre_track.to_point(details['position'].to_f)
                _update_detail(alert, details, AlertDetail.create('location', "POINT(#{pnt.x} #{pnt.y})", true)) if pnt
            end
        end

        # Add the helios specific ids.
        if details.has_key? 'helios_unit_id'
            helios = HeliosUnit.with_geometry.find(details['helios_unit_id'].to_i)
            if helios.location and !details.has_key? 'location'
                @logger.info "creating location for alert #{alert['name']}, id=#{alert.id} from Helios location"
                _add_detail(alert, details, AlertDetail.create('location', helios[:location_as_text], true))
            end
            if !details.has_key? "fibre_line_id"
                helios.fibre_lines.each do |line|
                    alert.alert_details << AlertDetail.create('affected_fibre_line_id', line.id, false)
                    alert.alert_details << AlertDetail.create('affected_fibre_line_name', line.name, false)
                end
            end
        end

        # If we have any affected_fibre_line_id parameters we add an affected_fibre_line_name
        # for each of them.
        @logger.info "looking for affected fibres"
        if details.has_key? 'affected_fibre_line_id'
            fibreLineIds = []
            alert.alert_details.each { |det| fibreLineIds << det.value.to_i if det.key == 'affected_fibre_line_id' }
            fibres = FibreLine.find(fibreLineIds)
            fibres.each { |fl| alert.alert_details << AlertDetail.create('affected_fibre_line_name', fl.name) }
        end
    end

    # Flag the alert to be included in the next set of notifications.
    def send_alert_notification(alert)
        alert.notification_pending = true
        alert.notification_pending2 = true
        alert.save
    end

    def send_alert_notification_email(alert, reason = nil)
        #Only do this if the panoptes is active
        return if File.exists?(IS_NOT_ACTIVE_PANOPTES_FILE)

        orgs = []
        if alert.organization_id
            orgs << Organization.find(alert.organization_id)
        else
            orgs = Organization.not_deleted.all
        end
        system_prefs = SystemPreference.find_all_as_hash()
        time = Time.now
        time_string = (Time.now.to_f * 10000).to_i.to_s


        orgs.each do |x|
            org_prefs = OrganizationPreference.for_organization_as_hash(x.id)
            org_email_lists = NotificationEmailList.where(organization_id: x.id)
            org_email_lists.each do |elist|
                # Ignore any email configurations that are inactive or that have no recipients.
                @logger.info "EXAMINING LIST #{ elist.id }"
                @logger.info " REJECTING AS INACTIVE" and next unless elist.is_active
                @logger.info " REJECTING AS NO RECIPIENTS" and next if elist.recipients.nil? or elist.recipients.empty?

                # If this is an event alarm, ignore any configurations that have event alarms disabled,
                # or that do not include alarms at this threat level.
                if alert.is_event_alarm?
                    @logger.info " REJECTING - NOT INCLUDING EVENT ALARMS" and next unless elist.include_event_alarms
                    @logger.info " REJECTING - WRONG THREAT LEVEL" and next unless elist.event_alarm_levels.to_s.split(',').include? alert.threat_level
                else
                    # If this is a system alarm, ignore any configurations that have system
                    # alarms disabled.
                    @logger.info " REJECTING - NOT INCLUDING SYSTEM ALARMS" and next unless elist.include_system_alarms
                end

                # Examine the date and time
                alert_day_of_week = alert.time.wday
                alert_time_of_day = alert.time.hour + alert.time.min/60.to_f

                @logger.info " REJECTING - NOT PASSING DAY FILTER" and next unless check_day(alert_day_of_week, elist)
                @logger.info " REJECTING - NOT PASSING TIME FILTER" and next unless check_time(alert_time_of_day, elist)

                # Generate the email.
                @logger.info "CREATING EMAIL based on #{ elist.id }: #{ elist.name }"

                mail = nil

                case elist.message_format
                when 'Email'
                  AlertMailer.with(alert: Alert.with_status.find(alert.id),
                                   org_prefs: org_prefs,
                                   system_prefs: system_prefs,
                                   subject: elist.subject,
                                   recipients: elist.recipients,
                                   reason: reason).alarm_notification_email.deliver_now
                when 'SMS'
                  alert = Alert.with_status.find(alert.id)
                  if (alert.status == 'new')
                    AlertMailer.with(alert: Alert.with_status.find(alert.id),
                                     org_prefs: org_prefs,
                                     system_prefs: system_prefs,
                                     subject: elist.subject,
                                     recipients: elist.recipients,
                                     reason: reason).alarm_notification_sms.deliver_now
                  end
                else
                  @logger.error "Not a valid notification format (must be 'Email' or 'SMS')."
                end
            end
        end
    rescue => ex
        puts ex.message
        @logger.info("EMAIL FOR ALERT #{alert.id} FAILED")
        @logger.info(ex.message)
        @logger.info(ex.backtrace.join("\n"))
    end

    # Return a hash of all the key/value details for the alert.
    def details_hash(alert)
        details = {}
        alert.alert_details.each { |det| details[det.key] = det.value }
        return details
    end

	def check_day(alert_day_of_week, elist)
		case alert_day_of_week
		when 0
			return elist.sunday
		when 1
			return elist.monday
		when 2
			return elist.tuesday
		when 3
			return elist.wednesday
		when 4
			return elist.thursday
		when 5
			return elist.friday
		when 6
			return elist.saturday
                else
	    	        @logger.info " INVALID DAY OF WEEK INDEX #{alert_day_of_week} SHOULD BE IN RANGE [0-6]"
	    	        return false
                end
	end

	def check_time(alert_time_of_day, elist)
    result = true
		unless elist.start_time.nil?
        start_time = elist.start_time.hour + elist.start_time.min/60.to_f
        result &&= (alert_time_of_day >= start_time)
		end
		unless elist.end_time.nil?
        end_time = elist.end_time.hour + elist.end_time.min/60.to_f
        result &&= (alert_time_of_day <= end_time)
    end

		result
	end
end


