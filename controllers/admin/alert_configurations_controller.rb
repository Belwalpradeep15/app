#  notifications_controller.rb
#  panoptes
#
#  Created by Steven W. Klassen on 2013-01-31.
#  Copyright (c) 2013 Fotech Solutions (Canada) Ltd. All rights reserved.



class Admin::AlertConfigurationsController < AdminController
    before_action :security_check

    # Construct the alert system configuration page.
    def index
        @threat_config_templates = YAML.load_file("config/threat_configuration_templates.yml")
        @preferences = get_preferences_as_hash_with_defaults
        @menu = setup_admin_menu
        @title = I18n.t('admin.alert_configs.title')
        system_prefs = SystemPreference.all
        enabled_pref = system_prefs.find{|x| x.key == 'alerts-enabled'}
        @alerts_enabled = enabled_pref ? enabled_pref.value == 'true' : false
        alert_on_system_warnings_pref = system_prefs.find{|x| x.key == 'alert_on_system_warnings'}
        @alert_on_system_warnings = alert_on_system_warnings_pref ? alert_on_system_warnings_pref.value == 'true' : false
        alerts_require_comment_text = system_prefs.find{|x| x.key == 'alerts_require_comment_text'}
        @alerts_require_comment_text = alerts_require_comment_text ? alerts_require_comment_text.value == 'true' : false
        retrigger_pref = system_prefs.find{|x| x.key == 'alerts_retrigger_enabled'}
        @alerts_retrigger_enabled = retrigger_pref ? retrigger_pref.value == 'true' : false
        @threat_counting_period_s = system_prefs.find{|x| x.key == 'threat_counting_period_s'}.value rescue '0'
        @alerts_retrigger_minutes = system_prefs.find{|x| x.key == 'alerts_retrigger_minutes'}.value rescue '10'


        event_aggregation_pref = system_prefs.find{|x| x.key == 'event_aggregation_enabled'}
        @event_aggregation_enabled = event_aggregation_pref ? event_aggregation_pref.value == 'true' : false


        @show_prefs = {}
        show_clear_pref = system_prefs.find{|x| x.key == 'alerts-show-clear'}
        @show_prefs['clear'] = show_clear_pref ? show_clear_pref.value : 'none'
        show_green_pref = system_prefs.find{|x| x.key == 'alerts-show-green'}
        @show_prefs['green'] = show_green_pref ? show_green_pref.value : 'none'
        show_amber_pref = system_prefs.find{|x| x.key == 'alerts-show-amber'}
        @show_prefs['amber'] = show_amber_pref ? show_amber_pref.value : 'none'
        show_red_pref = system_prefs.find{|x| x.key == 'alerts-show-red'}
        @show_prefs['red'] = show_red_pref ? show_red_pref.value : 'none'
        @configs = AlertConfiguration.all
        @configs_hash = {}
        @configs.each do |x|
            @configs_hash[x.alert_type] ||= {}
            @configs_hash[x.alert_type][x.key] = x.value
        end
        @sounds = Dir.glob("public/audio/*").collect{|x| x.gsub('public','')}.sort_by{|x| x.match(/([^\/]*)\..*$/)[1]}
        @event_types = EventType.where("name != 'fibre_break'")
        @event_alert_types = @event_types.collect{|x| x.name + "_alert"}
        @event_alert_types = @event_alert_types.sort_by{|x| I18n.t("alert.name.#{x}").downcase}
        @threat_configurations = ThreatConfiguration.all.includes([:threat_increments, :threat_thresholds]);
        @threat_configurations = @threat_configurations.sort_by{|x| I18n.t("alert.name.#{x.alert_name}")}
        @system_alert_types = %w(helios panoptes panoptes_child cabinet comms fibre_break_alert)
        @system_alert_types = @system_alert_types.sort_by{|x| I18n.t("alert.name.#{x}").downcase}
        render :layout => "admin"
    end

    def create_or_update_alert_configurations
        @dialogId = "content"
        @formId = "content"
        if params[:new_threat_configuration]
            build_new_threat_config
            heliosupdate
        else
            save_alert_configurations
        end
    end

    # Create/update the alert_configs settings.
    def create
        create_or_update_alert_configurations
        render :template => "/admin/create.js"
    end

    def update
        create_or_update_alert_configurations
        render :template => "/admin/update.js"
    end

    def destroy
        AlertConfiguration.transaction do
            @threat_configuration = ThreatConfiguration.find(params[:id])
            @threat_configuration.destroy
		end
        heliosupdate
        render :template => "/admin/destroy.js"
    end


    def build_new_threat_config
        event_type_id = params[:event_type_id]
        config = ThreatConfiguration.new(:event_type_id => event_type_id, :created_by_id => current_user.id)
        config.save
    end

    def save_alert_configurations
        logger.info "Create/update alert-configurations"
        alerts_enabled = params["alerts-enabled"] ? 'true':'false'
        alert_on_system_warnings = params["alert_on_system_warnings"] ? 'true':'false'
        alerts_require_comment_text = params["alerts_require_comment_text"] ? 'true' : 'false'
        event_aggregation_enabled = params["event_aggregation_enabled"] ? 'true' : 'false'
        alerts_retrigger_enabled = params["alerts_retrigger_enabled"] ? 'true' : 'false'

        clear_display = params["alerts-show-clear"]
        green_display = params["alerts-show-green"]
        amber_display = params["alerts-show-amber"]
        red_display = params["alerts-show-red"]
        counting_period = params["threat_counting_period_s"]
        alerts_retrigger_minutes = params["alerts_retrigger_minutes"]

        SystemPreference.transaction do
            SystemPreference.create_or_update('alerts-enabled', alerts_enabled)
            if alerts_enabled == 'true'
                SystemPreference.create_or_update('alert_on_system_warnings', alert_on_system_warnings)
                SystemPreference.create_or_update('alerts_require_comment_text', alerts_require_comment_text)
                SystemPreference.create_or_update('alerts-show-clear', clear_display)
                SystemPreference.create_or_update('alerts-show-green', green_display)
                SystemPreference.create_or_update('alerts-show-amber', amber_display)
                SystemPreference.create_or_update('alerts-show-red', red_display)
                SystemPreference.create_or_update('threat_counting_period_s', counting_period)
                SystemPreference.create_or_update('event_aggregation_enabled', event_aggregation_enabled)
                SystemPreference.create_or_update('alerts_retrigger_enabled', alerts_retrigger_enabled)
                if alerts_retrigger_enabled == 'true'
                    SystemPreference.create_or_update('alerts_retrigger_minutes', alerts_retrigger_minutes)
                end
            end
        end

        params.permit!

        AlertConfiguration.transaction do
            params.each_pair do |alert_type, config_hash|
                next if alert_type[/^raw_/]
                next unless config_hash.respond_to? :to_hash

                config_hash = config_hash.to_hash

                AlertConfiguration.create_or_update(alert_type, 'sound', config_hash['sound'])
                AlertConfiguration.create_or_update(alert_type, 'repeat_sound', config_hash['repeat_sound'])

                if config_hash['update_position_on']
                    AlertConfiguration.create_or_update(alert_type, 'update_position_on', config_hash['update_position_on'])
                end

                #save threat configurations
                changes_made = false
                if config_hash['threat_configuration']
                    threat_config = ThreatConfiguration.find_by_alert_name(alert_type)
                    config_hash['threat_configuration']['is_active'] = (config_hash['threat_configuration']['is_active'] == 'TRUE')
                    config_hash['threat_configuration']['event_aggregation_enabled'] = event_aggregation_enabled
                    config_hash['threat_configuration']['logging_enabled'] = (config_hash['threat_configuration']['logging_enabled'] == 'TRUE')
                    config_hash['threat_configuration']['always_red_after_timeout_enabled'] = (config_hash['threat_configuration']['always_red_after_timeout_enabled'] == 'TRUE')
                    threat_config.attributes = config_hash['threat_configuration']
                    changes_made ||= threat_config.changed?
                    threat_config.updated_by_id = current_user.id
                    threat_config.save
                    if config_hash['threat_increment']
                        config_hash['threat_increment'].keys.each do |increment_type|
                            inc = threat_config.get_increment_by_name(increment_type)
                            inc.attributes = config_hash['threat_increment'][increment_type]
                            changes_made ||= inc.changed?
                            inc.save
                        end
                    end
                    if config_hash['threat_threshold']
                        config_hash['threat_threshold'].keys.each do |threshold_type|
                            thr = threat_config.get_threshold_by_name(threshold_type)
                            thr.attributes = config_hash['threat_threshold'][threshold_type]
                            changes_made ||= thr.changed?
                            thr.save
                        end
                    end

                    if changes_made
                        threat_config.updated_at = Time.now.utc
                        threat_config.save
                    end
                end
            end
        end
        heliosupdate
    end

    def heliosupdate
        helios_units = HeliosUnit.where(is_active: true)
        helios_units.each do |helios|
            begin
                control = HeliosControl.new(helios)
                control.update_threat_tables
                @error = nil
            rescue => ex
                @error = "Could not update the Helios server #{helios.name}, exception=#{ex}."
            end
        end
    end

    private

    # Permissions checks.
    def security_check
        security_breach unless can? :manage, :alert_configurations
    end
end
