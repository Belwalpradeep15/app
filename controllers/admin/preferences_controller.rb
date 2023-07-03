# $Author$
# $Date$
# $Rev$
# $URL$
#
# COPYRIGHT:
# This file is Copyright (c) 2009 Fotech Solutions Ltd. All rights reserved.

require 'rexml/xpath'


class Admin::PreferencesController < AdminController

    # Entry point to the preferences administration page.
    def index
        @preference_defs = get_preferences
        @suppressUser = true
        @title = "Fotech Solutions Monitor Preferences"
    end

    # Setup a form for submitting preferences. Note that the HTML this returns will be
    # a partial intended to be inserted into an existing document.
    def form
        render :partial => "/admin/update_form"
    end

    # For preferences this is (almost) a synonym for create, except that it performs
    # a refresh of the display. This version is used by the javascripts that set or
    # change a value and want a response that displays any error messages then refreshes
    # the display.
    def update
        begin
            Preference.create_or_update(params[:field], params[:value], current_user)
            @error = nil
            @id = params[:id]
			if @id.nil?		# This will be the case in a portal request
				@id = params[:preferenceKey]
			end
            @key = params[:field]
            @value = params[:value]
        rescue => ex
            log_exception ex
            @error = ex
        end
    end

    # Reset the user's preferences to their default values.
    # We do this by deleting all the preferences for that user.
    def reset
        begin
            Preference.transaction do
                Preference.where("user_id = #{current_user.id}").delete_all
                @preference_defs = get_preferences
            end
            @error = nil
        rescue => ex
            log_exception ex
            @error = ex
        end
    end

end
