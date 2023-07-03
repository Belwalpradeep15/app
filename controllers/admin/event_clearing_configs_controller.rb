# FILENAME:     event_clearing_configs_controller.rb
# AUTHOR:       Karina Simard
# CREATED ON:   10-07-29
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

class Admin::EventClearingConfigsController < AdminController

    before_action :security_check

    # Entry point to the event tracking configuration administration page.
    def index
        @eventTypes = EventType.get_active
        EventType.sort_by_description(@eventTypes)
        @menu = setup_admin_menu
        @title = I18n.t('admin.configuration.event_clearing.title')
        @suppressUser = true
        render :layout => "admin"
    end

    # Modify an existing helios unit.
    def update
        begin
            EventType.transaction do
                @eType = EventType.find(params[:id])
                @eType.clearing_interval = params[:value]
                @eType.save
            end
            @error = nil
            @formId = 'row_' + params[:id]
        rescue => ex
            @error = ex
        end
    end

    def create
        #can't create... we are only updating one field of the event type record
    end

    def edit
        #no separate edit screen
    end

    # Delete an existing event tracking configuration.
    def destroy
        #cannot destroy an event type through the ui
    end

  private

    # Perform our permission checks and throw an exception if they fail.
    def security_check
        security_breach unless can? :manage, :event_clearing
    end

end



