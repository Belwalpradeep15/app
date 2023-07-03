# FILENAME:     helios_control.rb
# AUTHOR:       Steven Klassen
# CREATED ON:   2011-01-06
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
# This file is Copyright © 2011 Fotech Solutions Ltd. All rights reserved.

require 'timeout'
require 'base64'



class HeliosControl

    # Construct a control object for the given helios unit.
    def initialize(helios_unit)
        @helios_unit = helios_unit
        @comms = @helios_unit.get_comms
    end

    # Start the helios unit.
    def start
        submit_command("<start_fdel/>")
    end

    # Stop the helios unit.
    def stop
        submit_command("<stop_fdel/>")
    end

    # Start the laser. Returns false if the command was accepted but the laser was
    # locked out.
    def start_laser
        str = @comms.write("<start_laser/>")
        str = str.chomp
        return true \
            if str[/OK/]
        return false \
            if str[/LOCKED OUT/]
        raise "Helios #{@helios_unit.name} returned an error #{str}."
    end

    # Stop the laser.
    def stop_laser
        submit_command('<stop_laser/>')
    end

    # Updates threat tables.
    # Does not raise error if helios unit does not support this command.
    def update_threat_tables
        threat_configurations = ThreatConfiguration.all
        update_command = generate_update_command(threat_configurations)
        submit_command(update_command)
    end

    def get_threat_uuids_from_ids(ids)
   	  uuids = []

      ids.each do |id|
        # convert here the id to uuid
        db_record = AlertDetail.where("alert_id='#{id}'")
        db_record.each do |rec|
          if rec.key == 'threatUUID'
            uuid = rec.value
            uuids.push(uuid)
          end
        end
      end
     return uuids
    end

    # function to resolve threats on Helios side
    def resolve_threats(ids)
      uuids = get_threat_uuids_from_ids(ids)
      xml_threats_resolve_command = gen_threat_command(uuids, "resolve")
      submit_command(xml_threats_resolve_command)
    end

       # function to delete threats on Helios side
    def delete_threats(ids)
	  uuids = get_threat_uuids_from_ids(ids)
      xml_threats_resolve_command = gen_threat_command(uuids, "delete")
      submit_command(xml_threats_resolve_command)
    end

    private

    # Submit a command and raise an exception if it fails.
    # Optionally,
    def submit_command(command, no_fail_on_unsupported = false)
        str = @comms.write(command)
        raise "Helios #{@helios_unit.name} returned no value." if str.nil?
        str = str.chomp
        if no_fail_on_unsupported and str[/ERR: Unsupported command/]
            Rails.logger.info "Ignoring: Helios #{@helios_unit.name} returned an error #{str}."
            return
        end
        raise "Helios #{@helios_unit.name} returned an error #{str}." if (not str[/OK/]) and (not str[/LOCKED OUT/])
    end

	  def generate_update_command(threat_configurations)
      counting_period = SystemPreference.find_by_key("threat_counting_period_s").value
      threat_command = "<update_threat_tables><counting_period>#{counting_period}</counting_period><threat_configurations>"
      threat_configurations.each do |threat_configuration|
        threat_command += "<threat_configuration><name>#{threat_configuration.alert_name}</name><counting_width>#{threat_configuration.counting_width}</counting_width><decrement_value>#{threat_configuration.decrement_value}</decrement_value><is_active>#{threat_configuration.is_active}</is_active>"
        threat_command += "<logging_enabled>#{threat_configuration.logging_enabled}</logging_enabled>"
        threat_increments = ThreatIncrement.where(threat_configuration_id: threat_configuration.id)
        threat_command += "<increments>"

        threat_increments.each do |inc|
          threat_command += "<increment><name>#{inc.name}</name><value>#{inc.increment_value}</value><threshold>#{inc.threshold}</threshold></increment>"
        end

        threat_command += "</increments>"
        threat_command += "<thresholds>"

        threat_thresholds = ThreatThreshold.where(threat_configuration_id: threat_configuration.id)

        threat_thresholds.each do |threshold|
          threat_command += "<threshold><name>#{threshold.name}</name><value>#{threshold.threshold}</value><clearance>#{threshold.clearance}</clearance><hysteresis>#{threshold.hysteresis}</hysteresis></threshold>"
        end

        threat_command += "</thresholds>"
        threat_command += "<event_aggregation_enabled>#{threat_configuration.event_aggregation_enabled}</event_aggregation_enabled>"
        threat_command += "<always_red_after_timeout_enabled>#{threat_configuration.always_red_after_timeout_enabled}</always_red_after_timeout_enabled>"
        threat_command += "<always_red_after_timeout_s>#{threat_configuration.always_red_after_timeout_s}</always_red_after_timeout_s>"
		threat_command += "<initial_threat_level>#{threat_configuration.initial_threat_level}</initial_threat_level>"
        threat_command += "</threat_configuration>"
      end
      threat_command += "</threat_configurations></update_threat_tables>"
      return threat_command
    end

    def gen_threat_command(uuids, type)

      xml_cmd = ''

      uuids.each do |uuid|
        uuid_str = uuid.to_s
        xml_cmd = xml_cmd  + " <uuid>#{uuid_str}</uuid> "
      end

      xml_cmd = "<#{type}_threat>" + '<uuids>' + xml_cmd + '</uuids>' + "</#{type}_threat>"

      return xml_cmd
    end

end









