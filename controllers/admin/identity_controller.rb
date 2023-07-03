#  identity_controller.rb
#  panoptes
#
#  Created by Steven W. Klassen on 2013-02-01.
#  Copyright (c) 2013 Fotech Solutions (Canada) Ltd. All rights reserved.

class Admin::IdentityController < AdminController
    before_action :security_check

    # Construct the identity configuration page.
    def index
        @menu = setup_admin_menu
        @title = I18n.t('admin.identity.title')

        @organizations = current_user.organizations
        @organizations.each do |org|
            prefs = OrganizationPreference.for_organization_as_hash(org.id)
            idPrefs = {}
            set_pref_with_default(idPrefs, prefs, 'identity_custom_name', '')
            set_pref_with_default(idPrefs, prefs, 'identity_custom_id', '')
            org.identity_preferences_cache = idPrefs
        end

        prefs = SystemPreference.find_all_as_hash()
        @identity_preferences = {}
        set_pref_with_default(@identity_preferences, prefs, 'identity_name', '')
        set_pref_with_default(@identity_preferences, prefs, 'identity_uuid', '')
        set_pref_with_default(@identity_preferences, prefs, 'identity_serial_number', '')


        render :layout => "admin"
    end

    # Update the system identity properties.
    def update_system
        logger.debug "Create/update system identity settings"
        SystemPreference.transaction do
            SystemPreference.create_or_update('identity_name', params[:identity_name].strip)
            SystemPreference.create_or_update('identity_uuid', params[:identity_uuid].strip)
            SystemPreference.create_or_update('identity_serial_number', params[:identity_serial_number].strip)

        end
        @formId = "identity_panel"
        render :template => "/admin/create.js"
    end

    # Update the custom identity properties for an organization.
    def update_custom
        logger.debug "Create/update identity settings for org_id=#{params[:organization_id]}"
        orgId = Integer(params[:organization_id])
        OrganizationPreference.transaction do
            OrganizationPreference.create_or_update(orgId, 'identity_custom_name', params[:identity_custom_name].strip)
            OrganizationPreference.create_or_update(orgId, 'identity_custom_id', params[:identity_custom_id].strip)
        end
        @formId = "identity_panel_#{orgId}"
        render :template => "/admin/create.js"
    end

  private

    # Permission checks.
    def security_check
        security_breach unless (can?(:manage, :system) or can?(:manage, :organizations) or can?(:manage, :company))
    end
end

