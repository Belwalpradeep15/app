#  notifications_controller.rb
#  panoptes
#
#  Created by Steven W. Klassen on 2013-01-31.
#  Copyright (c) 2013 Fotech Solutions (Canada) Ltd. All rights reserved.


class Admin::NotificationsController < AdminController
    before_action :security_check

    # Construct the notifications configuration page.
    def index
        setup

        render :layout => "admin"
    end

    # Create/update the notifications settings for an organization.
    def update
        if params[:field] and params[:field] == 'is_active'
            update_email_list_field
        elsif params[:is_email_list_form] and params[:is_email_list_form] == 'true'
            update_email_list
        else
            update_entire_page
        end
    end

    # Render the dialogs.
    def show
        if params[:email_list]
            if params[:email_list] == ""
                @emailList = new_email_list(params[:id])
            else
                @emailList = read_email_list(params[:email_list])
            end
            render :template => "/admin/notifications/edit_email_list", :layout => false
        else
            raise "unsupported operation"
        end
    end

    # Create the notifications settings for an organization. At the moment this only
    # handles the email list creation.
    def create
        if params[:is_email_list_form] and params[:is_email_list_form] == 'true'
            update_email_list
        else
            raise "unsupported operation"
        end
    end

    # Deletes an email list for an organization.
    def destroy
        NotificationEmailList.transaction do
            emailList = NotificationEmailList.find(params[:id])
            security_check_organization(emailList.organization_id)
            emailList.delete
        end
    rescue => ex
        @error = ex
    ensure
        @formId = "notifications_panel_#{params[:organization_id]}"
        render :template => "/admin/create.js"
    end

    def send_test
        settings = ActionMailer::Base.smtp_settings.clone
        if settings[:password]
            # Cover up password
            settings[:password] = settings[:password].gsub(/./,'*')
        end
        AlertMailer.with(recipients: params[:test_email_address], settings: settings).test_email.deliver_now
        redirect_to :action => 'index'
    end

private

    # Permissions checks.
    def security_check
        security_breach unless can? :manage, :notifications
    end

    def security_check_organization(orgId)
        belongsToOrg = false
        current_user.organizations.each { |org|
            if org.id == orgId
                belongsToOrg = true
                break
            end
        }
        security_breach unless belongsToOrg
    end

    # Get a checkmark parameter.
    def create_or_update_check_param(orgId, name, params)
        value = 'false'
        if params[name] == 'on'
            value = 'true'
        end
        OrganizationPreference.create_or_update(orgId, name, value)
    end

    def setup
        @menu = setup_admin_menu
        @title = I18n.t('admin.notifications.title')
        @organizations = current_user.organizations
        @organizations.each do |org|
            prefs = OrganizationPreference.for_organization_as_hash(org.id)
            notifPrefs = {}
            set_pref_with_default(notifPrefs, prefs, 'notifications_timezone', 'Etc/UTC')
            set_pref_with_default(notifPrefs, prefs, 'notifications_latlng_format', 'deg_dec')
            set_pref_with_default(notifPrefs, prefs, 'notifications_language', 'en')
            set_pref_with_default(notifPrefs, prefs, 'xml_notifications_url', '')
            set_pref_with_default(notifPrefs, prefs, 'xml_submit_heartbeats', 'false')
            set_pref_with_default(notifPrefs, prefs, 'xml_submit_alarms', 'false')
            set_pref_with_default(notifPrefs, prefs, 'xml_submit_health', 'false')
            set_pref_with_default(notifPrefs, prefs, 'xml_submit_events', 'false')
            set_pref_with_default(notifPrefs, prefs, 'xml_included_events', '')
            set_pref_with_default(notifPrefs, prefs, 'alarm_email_recipients', '')
            set_pref_with_default(notifPrefs, prefs, 'alarm_email_subject', '')
            set_pref_with_default(notifPrefs, prefs, 'email_submit_alarms', 'false')
            set_pref_with_default(notifPrefs, prefs, 'email_alert_level', 'green,amber,red')
            set_pref_with_default(notifPrefs, prefs, 'email_submit_system_alarms', 'false')
            set_pref_with_default(notifPrefs, prefs, 'system_alarm_email_recipients', '')
            set_pref_with_default(notifPrefs, prefs, 'system_alarm_email_subject', '')
            org.notification_preferences_cache = notifPrefs

            emailLists = NotificationEmailList.where(organization_id: org.id).order(:name)
            org.notification_email_lists_cache = emailLists
        end

        @tz_options = []
        ActiveSupport::TimeZone.all.each do |tz|
            time_string = tz.utc_offset < 0 ? '-' : "+"
            time_string << (tz.utc_offset.abs.to_f/3600.0).to_i.to_s.rjust(2,"0")
            time_string << ":"
            time_string << (tz.utc_offset.to_f%3600.0/60).to_i.to_s.rjust(2,"0")
            tz_clean_name = tz.tzinfo.name.gsub(/_/,' ').gsub(/^Etc\//,'')
            @tz_options << {:value => tz.tzinfo.name, :text => "(#{time_string}) #{tz_clean_name}"}
        end
        @tz_options.uniq!

        @active_event_types = EventType.get_active
        @inactive_event_types = EventType.all - @active_event_types
    end

    # Update a single field of an email notifications list.
    def update_email_list_field
        begin
            NotificationEmailList.transaction do
                NotificationEmailList.update_field(params[:id], current_user, params[:field], params[:value])
            end
            @error = nil
        rescue => ex
            log_exception ex
            @error = ex
        end
        render :template => "/admin/update.js"
    end

    # Create/update an email list
    def update_email_list
        begin
            if params[:id] == ""
                emailList = new_email_list(params[:organization_id])
            else
                emailList = read_email_list(params[:id])
                security_breach unless emailList.organization_id == params[:organization_id].to_i
                emailList.updated_at = Time.now
            end
            NotificationEmailList.transaction do
                emailList.is_active = (params[:is_active] ? true : false)
                emailList.name = params[:name]
                emailList.recipients = params[:recipients]
                emailList.subject = params[:subject]
                emailList.monday = (params[:monday] ? true : false)
                emailList.tuesday = (params[:tuesday] ? true : false)
                emailList.wednesday = (params[:wednesday] ? true : false)
                emailList.thursday = (params[:thursday] ? true : false)
                emailList.friday = (params[:friday] ? true : false)
                emailList.saturday = (params[:saturday] ? true : false)
                emailList.sunday = (params[:sunday] ? true : false)
                emailList.start_time = params[:start_time]
                emailList.end_time = params[:end_time]
                emailList.include_event_alarms = (params[:include_event_alarms] ? true : false)
                emailList.event_alarm_levels = params[:event_alarm_levels]
                emailList.include_system_alarms = (params[:include_system_alarms] ? true : false)
                emailList.message_format = params[:message_format]
                emailList.save!
            end
        rescue => ex
            log_exception ex
            @error = ex
        end
        @dialogId = "email_notifications_list_dialog"
        render :template => "/admin/create.js"
    end

    # Create and return a new email list object with our default settings.
    def new_email_list(orgId)
        el = NotificationEmailList.new
        el.organization_id = orgId
        el.is_active = true
        el.sunday = true
        el.monday = true
        el.tuesday = true
        el.wednesday = true
        el.thursday = true
        el.friday = true
        el.saturday = true
        el.include_event_alarms = true
        el.event_alarm_levels = 'red'
        el.include_system_alarms = true
        el.created_at = Time.now
        return el
    end

    # Read an email list and ensure the user has permission to view/edit it.
    def read_email_list(emailListId)
        el = NotificationEmailList.find(emailListId)
        security_check_organization(el.organization_id)
        return el
    end

    # Update the entire notifications page.
    def update_entire_page
        logger.debug "Create/update notifications settings for organization_id=#{params[:organization_id]}"
        orgId = Integer(params[:organization_id])
        OrganizationPreference.transaction do
            OrganizationPreference.create_or_update(orgId, 'notifications_timezone', params[:notifications_timezone])
            OrganizationPreference.create_or_update(orgId, 'notifications_latlng_format', params[:notifications_latlng_format])
            OrganizationPreference.create_or_update(orgId, 'notifications_language', params[:notifications_language])
            OrganizationPreference.create_or_update(orgId, 'xml_notifications_url', params[:xml_notifications_url])
            create_or_update_check_param(orgId, 'xml_submit_heartbeats', params)
            create_or_update_check_param(orgId, 'xml_submit_alarms', params)
            create_or_update_check_param(orgId, 'xml_submit_health', params)
            create_or_update_check_param(orgId, 'xml_submit_events', params)
            OrganizationPreference.create_or_update(orgId, 'xml_included_events', params[:xml_included_events])
        end

        @formId = "notifications_panel_#{params[:organization_id]}"
        render :template => "/admin/create.js"
    end
end
