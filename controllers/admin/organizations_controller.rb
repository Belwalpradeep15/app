# $Author$
# $Date$
# $Rev$
# $URL$
#
# COPYRIGHT:
# This file is Copyright (c) 2009 Fotech Solutions Ltd. All rights reserved.

class Admin::OrganizationsController < AdminController

    before_action :check_permissions

    # List all the organizations.
    def index
        @menu = setup_admin_menu
        @organizations = Organization.not_deleted.order('lower(name)')
        @suppressUser = true
        @title = I18n.t('admin.orgs.title')
        render :layout => "admin"
    end

    # Create a new organization.
    def create
        @reload_on_error = false
        org = Organization.not_deleted.exists?(:name => params[:name])
        if org
            @error = I18n.t('admin.orgs.dup_names')
        else
            org = Organization.new(:name => params[:name])
            org.save!
            flush_current_user
        end
        @dialogId = "organization_form"
        render :template => "/admin/create.js"

    end

    # Update an existing organization.
    def update
        org = Organization.not_deleted.exists?(["id <> ? AND name = ?", params[:id].to_i, params[:name]])
        if org
            @error = I18n.t('admin.orgs.dup_names')
        else
            org = Organization.find(params[:id])
            org.name = params[:name]
            org.save!
            flush_current_user
        end
        @formId = "row_#{ params[:id] }"
        @dialogId = "organization_form"
        render :template => "/admin/update.js"

    end

    # Delete an existing organization. If the organization has no fibre lines then it will be deleted.
    # Otherwise it will simply be marked as deleted.
    def destroy
        Organization.delete_with_dependants(params[:id].to_i, current_user.id)
        flush_current_user
        render :template => "/admin/destroy.js"
    end

  private

    # Check that ther user has the necessary permission.
    def check_permissions
      raise I18n.t('admin.orgs.cant_manage') if !can?(:manage, :organizations)
    end

end
