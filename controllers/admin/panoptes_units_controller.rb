# COPYRIGHT:
# This file is Copyright © 2019 Fotech Solutions Ltd. All rights reserved.

require 'set'
require 'rexml/document'

class Admin::PanoptesUnitsController < AdminController

    before_action :security_check

    # Entry point to the panoptes units administration page.
    def index
        @panoptes_units = PanoptesUnit.with_lat_lng.all.order(:name)
        @menu = setup_admin_menu
        @title = I18n.t('admin.panoptes_units.title')
        @latlng_format = get_preference('units-latlng')[:value]
        @latlng_precision = get_preference('precision-latlng')[:value]
        render :layout => "admin"
    end

    # Modify an existing panoptes unit.
    def update
        begin
            PanoptesUnit.transaction do
                PanoptesUnit.update_field(params[:id], current_user, params[:field], params[:value])
            end
            @error = nil
            @formId = 'row_' + params[:id]
        rescue => ex
            log_exception ex
            @error = ex
        end

        render :template => "/admin/update.js"
    end

    # Create a new panoptes unit.
    def create
        begin
            number_of_helios_units = HeliosUnit.all.length
            if (number_of_helios_units > 0) then
                raise "This Panoptes manages #{number_of_helios_units} Helios unit(s). Managing Panoptes units and Helios units simultaneously is not supported."
            end
            PanoptesUnit.transaction do
                panoptes = PanoptesUnit.new
                panoptes.serial_number = params[:serial_number]
                panoptes.name = params[:name]
                panoptes.host_name = params[:host_name]
                panoptes.ws_port = params[:ws_port].to_i
                panoptes.is_active = (!params[:is_active].nil? and params[:is_active] == '1' ? true : false)
                panoptes.save
            end
            @error = nil
        rescue => ex
            log_exception ex
            @error = ex
        end

        @dialogId = "panoptes_unit_dialog"
        render :template => "/admin/create.js"
    end

    # Delete an existing panoptes unit.
    def destroy
        begin
            PanoptesUnit.transaction do
                panoptes_id = params[:id].to_i
                PanoptesUnit.delete_with_dependancies(panoptes_id)
            end
            @error = nil
            @id = params[:id]
        rescue => ex
            @error = ex
        end
        render :template => "/admin/destroy.js"
    end

    private #---------------------------------------------------------------------


    # Perform our permission checks and throw an exception if they fail.
    def security_check
        security_breach unless can? :manage, :panoptes_units
    end
end


