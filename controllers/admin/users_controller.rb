# FILENAME:     users_controller.rb
# AUTHOR:       Karina Simard
# CREATED ON:   2009-11-27
#
# DESCRIPTION:  User management accessible to sys admins and organization owners
#
# LAST CHANGE:
# $Author$
#   $Date$
#    $Rev$
#    $URL$
#
# COPYRIGHT:
# This file is Copyright © 2009 Fotech Solutions Ltd. All rights reserved.


class Admin::UsersController < AdminController

    include ActionView::Helpers::JavaScriptHelper

    before_action :security_check

    # Entry point to the user administration pages.
    def index
        setup_data
        @menu = setup_admin_menu
        @title = I18n.t('admin.users.title')
        @title << ": #{@organization.name}" if @organization
        render :layout => "admin"
    end

    def new
        @suppressUser = true
        setup_data
        @user = User.new
        render :template => "/admin/users/edit", :layout => false
    end

    def create
        User.transaction do
            u = User.new
            u.fullname = params[:fullname].strip
            u.loginname = params[:loginname].strip
            u.roles = Role.find(params[:roles])

            if u.is_a? :system_admin
                u.organizations = Organization.not_deleted
            else
                u.organizations = Organization.where(id: params[:organization])
            end

            u.save!
            change_password(u, params)
        end

        @error = nil
        @id = params[:id]
    rescue => e
        log_exception e
        @error = e
    ensure
        render :action => 'user_response'
    end

    def show
      # find and return the account
    end

    def edit
        @suppressUser = true

        if request.get?
            setup_data
            @user = User.find(params[:id])
            render :layout => false
        elsif request.post?
            save_edit
        end
    end

    def save_edit
        if params[:id] == ""
            user = User.new
        else
            user = User.find(params[:id])
        end

        User.transaction do
            user.fullname = params[:fullname]
            user.loginname = params[:loginname]
            user.roles = Role.find(params[:roles])

            if user.is_a? :system_admin
                user.organizations = Organization.not_deleted
            else
                user.organizations = Organization.where(id: params[:organization])
            end

            user.save!   # save! throws exception if there is an error
            change_password(user, params)
        end
    rescue => e
        log_exception e
        @error = e
    ensure
        render :action => 'save_edit'
    end

    def update
        User.transaction do
            User.update(params[:id], params[:field] => params[:value]);
        end

        @error = nil
        @id = params[:id]
    rescue => e
        log_exception e
        @error = e
    ensure
        render :action => 'user_response'
    end

    # Delete a user.
    # If the user has created or modified any fibre lines then they will just
    # be marked as deleted, otherwise they will be physically deleted.
    def destroy
        user = User.find(params[:id])
        user.delete_with_dependancies
        @error = nil
        @id = params[:id]
    rescue => e
        log_exception e
        @error = e
    ensure
        render :action => 'user_response'
    end

    private

    # Perform our permission checks and throw an exception if they fail.
    def security_check
        security_breach unless can? :manage, :users
        # will only allow sys admins for now since backend stuff needs to be done
        # or can? :manage, :companies
    end

    # Read the common data.
    def setup_data
        @organizations = current_user.organizations
        @organizations = @organizations.sort_by{|x| x.name.downcase}

        if params[:organization_id] != nil
            @organization = Organization.not_deleted.find(params[:organization_id])
            security_breach unless @organizations.include? @organization
            user_list = @organization.users.reload
            user_list = user_list.delete_if{|u| u.is_a? :system_admin} unless has_role? :system_admin
            user_ids = user_list.collect{|x| x.id }
            @users = User.not_deleted.where(["id in (?)", user_ids]).includes([:organizations, :roles])
        else
            user_list = @organizations.collect{|x| x.users.reload}
            user_list.flatten!
            user_list = user_list.delete_if{|u| u.is_a? :system_admin} unless has_role? :system_admin
            user_ids = user_list.collect{|x| x.id}
            @users = User.not_deleted.where(["id in (?)", user_ids]).includes([:organizations, :roles])
        end

        @recordCount = @users.size
        role_list = ['organization_admin', 'basic_user', 'organization_tech']
        role_list << 'system_admin' if has_role? :system_admin
        @roles = Role.where(title: role_list)
        @roles = @roles.sort_by{|x| I18n.t('admin.roles.'+x.title)}
    end

    # Change the password based on our authentication type.
    def change_password(user, params)
        if params[:reset_password] == 'true'
          raise "Cannot set to empty passwords" if params[:new_password] == ""
          raise "Passwords do not match" if params[:new_password] != params[:confirm_password]

          logger.warn("AUTHENTICATION: Changing password for #{user.loginname} to #{params[:new_password].strip}")
          user.set_password params[:new_password]
          user.save!
        end
    end
end
