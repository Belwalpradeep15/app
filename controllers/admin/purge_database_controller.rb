# FILENAME:     purge_database_controller.rb
# AUTHOR:       Steven Klassen
# CREATED ON:   2011-01-10
#
# DESCRIPTION:  Purge and otherwise optimize the database.
#
# LAST CHANGE:
# $Author$
#   $Date$
#    $Rev$
#    $URL$
#
# COPYRIGHT:
# This file is Copyright © 2011 Fotech Solutions Ltd. All rights reserved.


class Admin::PurgeDatabaseController < AdminController

  before_action       :security_check
  skip_before_action  :verify_authenticity_token


  # Entry point to the database purging.
  def index
      @menu = setup_admin_menu
      @title = I18n.t('admin.purge_database.title')
      render :layout => 'admin'
  end

  # Perform the database purge.
  def purge
    begin
      cutoffInDays = params[:older_than].to_i

      @noEventsPurged = 0
      @noAlertsPurged = 0
      purge_script_full_path = 'purge_panoptes_db'
      Event.transaction do
        if params[:purge_events] && params[:purge_alerts]

        if File.exists?(purge_script_full_path)
          logger.info "#{purge_script_full_path} --purge_older_than_days #{cutoffInDays}  --vacuum"
          result = `#{purge_script_full_path} --purge_older_than_days #{cutoffInDays}  --vacuum`
          @noEventsPurged = result.split(',')[0].strip.to_i
          @noAlertsPurged = result.split(',')[1].strip.to_i
        else
          @noEventsPurged = Event.purge_historical_data(cutoffInDays)
          @noAlertsPurged = Alert.purge_historical_data(cutoffInDays)
        end
          elsif params[:purge_events]
            if File.exists?(purge_script_full_path)
              logger.info "#{purge_script_full_path} --ignore_alerts --purge_older_than_days #{cutoffInDays}  --vacuum"
              result = `#{purge_script_full_path} --ignore_alerts --purge_older_than_days #{cutoffInDays}  --vacuum`
              @noEventsPurged = result.strip.to_i
            else
              @noEventsPurged = Event.purge_historical_data(cutoffInDays)
            end
          elsif params[:purge_alerts]
            if File.exists?(purge_script_full_path)
              logger.info "#{purge_script_full_path} --ignore_events --purge_older_than_days #{cutoffInDays}  --vacuum"
              result = `#{purge_script_full_path} --ignore_events --purge_older_than_days #{cutoffInDays}  --vacuum`
              @noAlertsPurged = result.strip.to_i
            else
              @noAlertsPurged = Alert.purge_historical_data(cutoffInDays)
            end
        end
    end

    if @noEventsPurged > 0 or @noAlertsPurged > 0
      if !File.exists?(purge_script_full_path)
        Event.vacuum
      end
    end

    rescue Exception => ex
      @error = ex
      log_exception(ex)
    end

    render :layout => false
  end

  private

  # Ensure the user has permission to use this controller.
  def security_check
    security_breach unless can?(:trigger, :purge)
  end

end
