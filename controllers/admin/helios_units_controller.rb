# FILENAME:     helios_units_controller.rb
# AUTHOR:       Steven Klassen
# CREATED ON:   2009-11-30
#
# LAST CHANGE:
# $Author$
#   $Date$
#    $Rev$
#    $URL$
#
# COPYRIGHT:
# This file is Copyright © 2009 Fotech Solutions Ltd. All rights reserved.

require 'set'
require 'rexml/document'

class Admin::HeliosUnitsController < AdminController

    before_action :security_check, :except => [:edit_multiplexing_cycles, :update_multiplexing_cycles, :submit_multiplexing_cycles]

    # Entry point to the helios units administration page.
    def index
        @helios_units = HeliosUnit.with_lat_lng.all.order(:name)
        @menu = setup_admin_menu
        @title = I18n.t('admin.helios_units.title')
        @latlng_format = get_preference('units-latlng')[:value]
        @latlng_precision = get_preference('precision-latlng')[:value]
        render :layout => "admin"
    end

    # Modify an existing helios unit.
    def update
        begin
            HeliosUnit.transaction do
                HeliosUnit.update_field(params[:id], current_user, params[:field], params[:value])
            end

            update_threat_tables(HeliosUnit.find_by_id(params[:id]))

            @error = nil
            @formId = 'row_' + params[:id]
        rescue => ex
            log_exception ex
            @error = ex
        end

        render :template => "/admin/update.js"
    end

    # Create a new helios unit.
    def create
        id = nil
        begin
            number_of_panoptes_units = PanoptesUnit.all.length
            if (number_of_panoptes_units > 0) then
                raise "This Panoptes currently manages #{number_of_panoptes_units} other Panoptes unit(s). Managing Panoptes units and Helios units simultaneously is not supported."
            end

            HeliosUnit.transaction do
                helios = HeliosUnit.new
                helios.serial_number = params[:serial_number]
                helios.name = params[:name]
                helios.host_name = params[:host_name]
                helios.port = params[:port].to_i
                helios.ws_port = params[:ws_port].to_i
                helios.is_active = (!params[:is_active].nil? and params[:is_active] == '1' ? true : false)

                helios.save
                id = helios.id
            end

            @error = nil
        rescue => ex
            log_exception ex
            @error = ex

            @dialogId = "helios_unit_dialog"
            render :template => "/admin/create.js"
            return
        end

        begin
            logger.info "id=#{id}"
            update_threat_tables(HeliosUnit.find_by_id(id))
        rescue => ex
            log_exception ex
            @error = ex
            @reloadOnError = true
        end

        @dialogId = "helios_unit_dialog"
        render :template => "/admin/create.js"
    end

    # Delete an existing helios unit.
    def destroy
        begin
            HeliosUnit.transaction do
                helios_id = params[:id].to_i
                FibreLine.unassign_for_helios_unit(helios_id, current_user)
                HeliosUnit.delete_with_dependancies(helios_id)
            end
            @error = nil
            @id = params[:id]
        rescue => ex
            @error = ex
        end
        render :template => "/admin/destroy.js"
    end

    def edit_section_location
        @helios_unit = HeliosUnit.find(params[:id])
        fibre_lines = @helios_unit.fibre_lines.all.where(display_type_id: DisplayType.find_by_name('section'))
        other_calibrations = fibre_lines.collect{|x| x.section_calibration}.compact
        document_ids = other_calibrations.collect{|x| x.document_id}.compact.uniq
        @section_diagrams = Document.where(id: document_ids)
        @section_locations = HeliosSectionLocation.where(helios_unit_id: @helios_unit.id)

        if request.get?
        	render :layout => false
        elsif request.put?
            params.keys.select{|key| key[/x_offset_/]}.each do |key|
                document_id = key[/\d+/]
                x_offset = params['x_offset_'+document_id]
                y_offset = params['y_offset_'+document_id]

                helios_section_location = HeliosSectionLocation.where(helios_unit_id: @helios_unit.id, document_id: document_id).first

                if(x_offset.blank? and y_offset.blank?)
                    helios_section_location.destroy if !helios_section_location.nil?
                else
                    helios_section_location = HeliosSectionLocation.new(:helios_unit_id => @helios_unit.id, :document_id => document_id) if helios_section_location.nil?

                    helios_section_location.x_offset = x_offset
                    helios_section_location.y_offset = y_offset
                    helios_section_location.save
                end
            end

            @dialogId = 'helios_unit_section_location_dialog'
            render :template => '/admin/update.js'
        end
    end

    private #---------------------------------------------------------------------

    def update_threat_tables(helios_unit)
       if helios_unit.is_active
           control = HeliosControl.new(helios_unit)
           control.update_threat_tables
       end
    end

    # Perform our permission checks and throw an exception if they fail.
    def security_check
        security_breach unless can? :manage, :helios_units
    end
end


