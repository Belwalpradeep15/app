# FILENAME:     alert.rb
# AUTHOR:       Steven Klassen
# CREATED ON:   2010-08-03
#
# DESCRIPTION:  API for dealing with alerts.
#
# LAST CHANGE:
# $Author$
#   $Date$
#    $Rev$
#    $URL$
#
# COPYRIGHT:
# This file is Copyright © 2010 Fotech Solutions Ltd. All rights reserved.

require 'FotechXML'


class Alert < FotechActiveRecord
    attr_accessor :latitude, :longitude, :document_locations, :details, :tinyIcon, :on_route_info, :extra_regions, :position

    has_many :events, dependent: :nullify
    has_many :event_tracks, dependent: :nullify
    has_many :alert_details, -> { order  :id }, dependent: :delete_all
    has_many :alert_responses, ->(alert) { (AlertResponse.where(alert_id: alert.id).where.not(response: 'confirm').or(AlertResponse.where(alert_id: alert.id, time: AlertResponse.where(alert_id: alert.id, response: 'confirm').maximum('time')))).order(:time) }, dependent: :delete_all
    belongs_to :organization
    belongs_to :alert_maintainer

    scope :conditions, ->(args) { where args }
    scope :after, ->(time) { where("updated_at > ?", time) }

    # Use this scope when you want to include the status.
    # The valid statuses are 'new', 'acknowledged', and 'resolved'.
    # Note: These strings are also used in controld.
    scope :with_status,
        -> { select "
            alerts.*,
              (case when (alerts.time_resolved is not null) then 'resolved' when (alerts.time_acknowledged is not null) then 'acknowledged' else 'new' end) as status
              " }

    # Use this scope when you want to include the times and names of the most recent
    # acknowledgement and comment. It also includes the status.
    scope :with_recent_times,
        -> { select "
            count(*) over() AS alert_count,
            alerts.*,
            (case when (alerts.time_resolved is not null) then 'resolved' when (alerts.time_acknowledged is not null) then 'acknowledged' else 'new' end) as status,
            (select time from alert_responses where id = (select max(id) from alert_responses where alert_id = alerts.id and response = 'comment')) as last_commented_on,
            (select time from alert_responses where id = (select max(id) from alert_responses where alert_id = alerts.id and response = 'acknowledged')) as last_acknowledged_on,
            (select time from alert_responses where id = (select max(id) from alert_responses where alert_id = alerts.id and response = 'retrigger')) as last_retriggered,
            (select u.fullname from alert_responses ar
             inner join users u on u.id = ar.user_id
             where ar.id = (select max(id) from alert_responses where alert_id = alerts.id and response = 'comment')) as last_commented_by,
            (select u.fullname from alert_responses ar
             inner join users u on u.id = ar.user_id
             where ar.id = (select min(id) from alert_responses where alert_id = alerts.id and response = 'acknowledge')) as acknowledged_by,
            (select u.fullname from alert_responses ar
             inner join users u on u.id = ar.user_id
             where ar.id = (select max(id) from alert_responses where alert_id = alerts.id and response = 'resolve')) as resolved_by,
            (select max(ar.time) from alert_responses ar
             where ar.alert_id = alerts.id
             and response = 'escalate' and comments = 'i18n: alert.comments.escalated_green') as green_time,
            (select max(ar.time) from alert_responses ar
             where ar.alert_id = alerts.id
             and response = 'escalate' and comments = 'i18n: alert.comments.escalated_amber') as amber_time,
            (select max(ar.time) from alert_responses ar
             where ar.alert_id = alerts.id
             and response = 'escalate' and comments = 'i18n: alert.comments.escalated_red') as red_time,
            (select min(ev.time) from events ev
             where ev.alert_id = alerts.id) as oldest_event_time,
            (select max(ev.time) from events ev
             where ev.alert_id = alerts.id) as newest_event_time,
            (select count(*) from events ev
             where ev.alert_id = alerts.id) as event_count,
            (select ad.value from alert_details ad
              where ad.alert_id = alerts.id and ad.key = 'path_path_name') as path_name,
            (select ad.value from alert_details ad
              where ad.alert_id = alerts.id and ad.key = 'path_direction_of_travel') as path_direction,
            (select ad.value from alert_details ad
              where ad.alert_id = alerts.id and ad.key = 'path_distance') as path_distance,
            (select ad.value from alert_details ad
              where ad.alert_id = alerts.id and ad.key = 'path_velocity') as path_velocity
            " }

    # This ensures that our extra (non-model) attributes get included in the JSON.
    def as_json(options = {})
        super({ methods: [:latitude, :longitude, :document_locations, :details, :tinyIcon, :on_route_info] }.merge(options || {}))
    end

    def is_event_alarm?
        return Alert.is_event_alarm_by_name?(name)
    end

    def self.is_event_alarm_by_name?(alarmName)
        return !!EventType.find_by_name(alarmName.gsub(/_alert$/,''))
    end


    # Return the localized description of the alert. This will use the event type
    # description for event based alerts and the I18N translation based on the alert
    # name for all others.
    def description
        return Alert.description_by_name(name)
    end

    def self.description_by_name(alarmName)
        if Alert.is_event_alarm_by_name?(alarmName)
            eventName = alarmName.gsub(/_alert$/,'')
            eventType = EventType.where(name: eventName).first
            if !eventType.nil?
                return eventType.description
            end
        end

        # If we get here, then we use the internationalization.
        return I18n.t("alert.name.#{alarmName}")
    end

    # Respond to an alert. Note that if the response is 'acknowledged' or 'resolved' this
    # will have additional meaning to the system in that it will update the alert record
    # as well as adding a response record.
    def respond(response, id = nil, comments = nil, user = nil, acknwUpdate = false)

        # acknwUpdate set to 'false' allows the creation of multiple acknowledgement responses
        # by creating a new response even if there have been previous acknowledgements.
        # A value of 'true' maintains only one acknowledgement response in the alert history,
        # the most recent one via updating the existing active record in the database
        if response == 'acknowledge' and acknwUpdate and self.time_acknowledged
            local_now = Time.now
            ar = self.alert_responses.where([ "response = ?", response]).order("time").last
            AlertResponse.update(ar.id, :time => local_now, :comments => comments, :user => user)
            self.time_acknowledged = local_now
        else
            r = AlertResponse.new
            r.response = response
            r.comments = comments
            r.time = Time.now
            r.user = user
            self.alert_responses << r
            self.time_acknowledged = r.time if %['acknowledge','resolve'].include?(response) and !self.time_acknowledged
            self.time_resolved = r.time if response == 'resolve' and !self.time_resolved
        end

        self.save

        # Call any listeners.
        call_respond_listeners(r, RAILS_DEFAULT_LOGGER)
    end

    def respond_resolve_for_threats(ids)
        # resolve the threats on Helios side
        helios_units = HeliosUnit.where(is_active: true)
        helios_units.each do |helios|

            begin
                control = HeliosControl.new(helios)
                control.resolve_threats(ids)
                @error = nil
            rescue => ex
                @error = "Could not update the Helios server #{helios.name}, exception=#{ex}."
            end
        end
    end

    def self.respond_delete_for_threats(ids)
        # delete the threats on Helios side
        helios_units = HeliosUnit.where(is_active: true)
        helios_units.each do |helios|

            begin
                control = HeliosControl.new(helios)
                control.delete_threats(ids)
                @error = nil
            rescue => ex
                @error = "Could not update the Helios server #{helios.name}, exception=#{ex}."
            end
        end
    end

    # Call the generate listeners for this alert.
    def call_generate_listeners(logger)
        ALERT_LISTENERS.each do |listener|
            if listener.respond_to? 'on_generate'
                listener.on_generate(self, logger)
            end
        end
    end

    # Call the respond listeners for this alert.
    def call_respond_listeners(r, logger)
        ALERT_LISTENERS.each do |listener|
            if listener.respond_to? 'on_respond'
                listener.on_respond(self, r, logger)
            end
        end
    end

    # Generate an alert from an xml document.
    def self.new_from_xml(xml)
        doc = (xml.is_a? String) ? XmlSupport::XmlDocument.create(xml) : xml

        org = nil
        org_el = doc.organization
        if org_el
            org = Organization.find(org_el['organization-id'].to_i) if org_el
            raise "Could not find organization for the id #{org_el['organization-id']}." if not org
        end

        details = []
        details << AlertDetail.create('alert-source', doc.source, true)

        detail_elements = doc.elements(:details)
        if detail_elements
            detail_elements.each { |d|
                visible = (d.attributes["visible"] ? (d.attributes["visible"].to_s == 'true') : true)
                details << AlertDetail.create(d.attributes["key"].to_s, d.text(), visible)
            }
        end

        return generate(doc.alert_name, doc.comments, org, details)
    end

    # Return the value of the first detail with the given key.
    def detail(key)
        self.alert_details.each { |ad| return ad.value if ad.key == key }
        return nil
    end

    def detail_list(key)
        return self.alert_details.select{|ad| ad.key == key}.collect{|x| x.value}
    end

    #this will append a detail
    def append_detail(key, value)
        self.alert_details << AlertDetail.new(:key => key, :value => value)
        save
    end

    def update_detail(key, value, visible=nil)
        detail = self.alert_details.select{|ad| ad.key == key}
        if detail.length == 0
            self.alert_details.create(:key => key, :value => value, :visible => visible.nil? ? true : visible)
            save
        elsif detail.length == 1
            detail[0].value = value
            if not visible.nil?
                detail[0].visible = visible
            end
            detail[0].save
        else
            raise "Duplicate entries for key:#{key} found, you just update this detail manually"
        end
    end

    def append_extra_json_variables
        str = self.detail('location')
        if str
            self.longitude = str[/[+-]?[0123456789.0123456789]+/]
            self.latitude = str[/ [+-]?[0123456789.0123456789]+/].strip!
        end

        #attempt to attach document locations to the self
        helios_id = self.detail('helios_unit_id')
        if helios_id
            self.document_locations = {}
            HeliosSectionLocation.where(helios_unit_id: helios_id).each do |loc|
                self.document_locations[loc.document_id] = {:xoffset => loc.x_offset, :yoffset => loc.y_offset}
            end
        end

        self.details = Hash[*self.alert_details.collect {|v| [v.key, v.value]}.flatten]

        self.tinyIcon = Alert.tiny_icon_for(self.name)

        # Determine some summary statistics for the alerts, this isn't technically
        # restricted to the JSON formats, however this is a convenient place to
        # put the code.

        summary = {}

        self.alert_responses.each do | alert |
            if summary[alert.response].nil?
                summary[alert.response] = 0
            end
            summary[alert.response] = summary[alert.response] + 1
        end
    end

    def is_acknowledged?
        return !time_acknowledged.nil?
    end

    def is_resolved?
        return !time_resolved.nil?
    end

    # Return the path of the small icon used for this alert.
    def tiny_icon
        Alert.tiny_icon_for(name)
    end

    def self.tiny_icon_for(alert_name)
        if alert_name[/_alert$/]
            event_type = EventType.find_by_name(alert_name[/(.*?)_alert/,1])
            return event_type.image_path('small') unless event_type.nil?

            return "/images/fotech/fibre/small_event_markers/unknown.png"
        elsif Alert.alert_types.include? alert_name
            return "/images/fotech/fibre/alerts/#{ alert_name }_small.png"
        else
            return "/images/alert_16x18.png"
        end
    end

    # Return the path of the small icon used for this alert.
    def small_icon
        Alert.small_icon_for(name)
    end

    def self.small_icon_for(alert_name)
        if alert_name[/_alert$/]
            event_type = EventType.find_by_name(alert_name[/(.*?)_alert/,1])
            return event_type.image_path('medium') unless event_type.nil?

            return "/images/fotech/fibre/event_markers/unknown.png"
        elsif Alert.alert_types.include? alert_name
            return "/images/fotech/fibre/alerts/#{ alert_name }_small.png"
        else
            return "/images/alert_16x18.png"
        end
    end

    # Return the path of the large icon used for this alert.
    def large_icon
        Alert.large_icon_for(name)
    end

    def self.large_icon_for(alert_name)
        if alert_name[/_alert$/]
            event_type = EventType.find_by_name(alert_name[/(.*?)_alert/,1])
            return event_type.image_path('large') unless event_type.nil?

            return "/images/fotech/fibre/large_event_markers/unknown.png"
        elsif Alert.alert_types.include? alert_name
            return "/images/fotech/fibre/alerts/#{ alert_name }_large.png"
        else
            return "/images/alert_16x18.png"
        end
    end

    def self.alert_types
        @@ALERT_TYPES + WATCHDOG_ALERT_TYPES + CUSTOM_ALERT_TYPES
    end

    def self.statuses
        @@STATUSES
    end

    # Returns onRouteinfo of alert
    def get_on_route_info(distance_units = 'm', distance_precision = 2, velocity_units = 'm_s', velocity_precision = 2)
        distance = self.detail("path_distance").to_f
        distance = UnitConversions.convert(distance, 'm', distance_units, distance_precision)
        markerName = self.detail("path_marker_name")
        pathName = self.detail("path_path_name")
        velocity = self.detail("path_velocity").to_f
        on_route_info = ""
        if velocity > 0
            velocity = UnitConversions.convert(velocity, 'm_s', velocity_units, velocity_precision)
            if velocity > 0
                direction = self.detail("path_direction_of_travel")
                on_route_info = I18n.t("admin.paths.moving_summary",
                                        :distance => distance,
                                        :distanceUnits => I18n.t("prefs.section.units.units-short.#{distance_units}"),
                                        :marker => markerName,
                                        :route => pathName,
                                        :direction => direction,
                                        :velocity => velocity,
                                        :velocityUnits => I18n.t("prefs.section.units.units-short.#{velocity_units}"))
            end
        end
        if on_route_info.blank?
            on_route_info = I18n.t("admin.paths.stationary_summary",
                                    :distance => distance,
                                    :distanceUnits => I18n.t("prefs.section.units.units-short.#{distance_units}"),
                                    :marker => markerName,
                                    :route => pathName)
        end

        return on_route_info
    end

    # Returns true if there are any unresolved alerts (including this one) that match the
    # alert type and the given detail.
    def are_unresolved_matches?(detailKey = nil)
        if time_resolved.nil?
            return true
        else
            detailValue = nil
            detailValue = detail(detailKey) if not detailKey.nil?

            if detailValue.nil?
                return Alert.record_exists? <<-SQL
                    SELECT 1 FROM alerts a
                    WHERE  a.name = '#{name}'
                    AND    a.time_resolved IS NULL;
                    SQL
            else
                return Alert.record_exists? <<-SQL
                    SELECT 1 FROM alerts a
                    INNER JOIN (SELECT alert_id, key, value FROM alert_details WHERE key = '#{detailKey}')
                               AS ad
                               ON ad.alert_id = a.id
                    WHERE a.name = '#{name}'
                    AND   a.time_resolved IS NULL
                    AND   ad.value = '#{detailValue}';
                    SQL
            end
        end
        return false
    end

    # Returns any unresolved fibre break alerts for the given fibre line id.
    def self.unresolved_fibre_break_alerts(fibre_line_id)
        return find_by_sql <<-SQL
                SELECT DISTINCT a.*
                FROM	alerts a
                INNER JOIN alert_details ad ON ad.alert_id = a.id AND ad.key = 'fibre_line_id'
                WHERE	a.name = 'fibre_break_alert'
                AND	a.time_resolved IS NULL
                AND	ad.value = '#{fibre_line_id}';
            SQL
    end

    # Returns true if there are any unresolved alerts that would affect a relay.
    def self.unresolved_relay_alerts?
        return record_exists? <<-SQL
                SELECT 1 FROM alerts a
                WHERE a.name = 'relay'
                AND a.time_resolved IS NULL
                LIMIT 1;
            SQL
    end

    # Returns any unresolved alarms for the given relay name.
    def self.unresolved_relay_alerts(relayName)
        return find_by_sql <<-SQL
                SELECT DISTINCT a.* FROM alerts a
                INNER JOIN alert_details ad ON ad.alert_id = a.id AND ad.key = 'name'
                WHERE a.name = 'relay'
                AND a.time_resolved IS NULL
                AND ad.value = '#{relayName}';
            SQL
    end

    # Returns the names of any relays that have an unresolved failed coils alarm. The return
    # is a set (hash with values of true) of all the relay names.
    def self.relays_with_failed_coils
        res = find_by_sql <<-SQL
                SELECT ad1.value AS relay_name FROM alerts a
                INNER JOIN alert_details ad ON ad.alert_id = a.id AND ad.key = 'failed_coils'
                INNER JOIN alert_details ad1 ON ad1.alert_id = a.id AND ad1.key = 'name'
                WHERE a.name = 'relay'
                AND a.time_resolved IS NULL;
            SQL
        relay_names = {}
        res.each { |row| relay_names[row['relay_name']] = true }
        return relay_names
    end

    # Pure alerts and alert related data older than the given number of days. Returns the
    # number of alerts that were removed.
    def self.purge_historical_data(days)
        cutoff = Time.now - (days * 24 * 60 * 60)
        cutoffSql = FotechDB::formatTime(cutoff)

        connection().execute <<-SQL
            DELETE FROM alert_details
            WHERE alert_id IN (
                SELECT id FROM alerts
                WHERE time < '#{cutoffSql}'
                AND time_resolved IS NOT NULL);

            DELETE FROM alert_responses
            WHERE alert_id IN (
                SELECT id FROM alerts
                WHERE time < '#{cutoffSql}'
                AND time_resolved IS NOT NULL);

            UPDATE events
            SET alert_id = NULL
            WHERE alert_id IN (
                SELECT id FROM alerts
                WHERE time < '#{cutoffSql}'
                AND time_resolved IS NOT NULL);

            UPDATE event_tracks
            SET alert_id = NULL
            WHERE alert_id IN (
                SELECT id FROM alerts
                WHERE time < '#{cutoffSql}'
                AND time_resolved IS NOT NULL);

        SQL

        numDeleted = connection().execute( "DELETE FROM alerts WHERE time < '#{cutoffSql}' AND time_resolved IS NOT NULL" ).cmd_tuples
        return numDeleted
    end

    #Hardcoded list of alert types and statuses
    @@ALERT_TYPES = %w(helios panoptes)
    @@STATUSES = %w(acknowledged resolved new)

end

