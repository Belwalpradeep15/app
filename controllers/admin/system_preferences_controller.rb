# FILENAME:     system_preferences_controller.rb
# AUTHOR:       Karina Simard
# CREATED ON:   10-09-07
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


class Admin::SystemPreferencesController < AdminController
    before_action :security_check

    def index
    end

    def update
        begin
            SystemPreference.create_or_update(params[:field], params[:value])
            @error = nil
            @id = params[:id]
            @key = params[:field]
            @value = params[:value]
        rescue => ex
            @error = ex
        end
    end

  private

    # Perform our permission checks and throw an exception if they fail.
    def security_check
        security_breach unless can? :manage, :system_preferences
    end
end
