# FILENAME:     helioscontrol_controller.rb
# AUTHOR:       Steven Klassen
# CREATED ON:   some date
#
# DESCRIPTION:  the controller that centralizes the code that polls the helios box
#
# LAST CHANGE:
# $Author: $
# $Date: $
# $Rev: $
# $URL: $
#
# COPYRIGHT:
# This file is Copyright (c) 2010 Fotech Solutions Ltd. All rights reserved.

require 'socket'
require 'timeout'

class Monitor::HelioscontrolController < MonitorController

    skip_before_action :set_locale, :only => :status


    # Obtain the statuses of all the helios boxes given in the post.
    def status
        heliosUnitIds = params[:helios_unit_ids].split(",").map { |idstr| idstr.to_i }
        heliosUnits = HeliosUnit.where(id: heliosUnitIds)
        @statuses = {}
        @laser_statuses = {}
        heliosUnits.each do |helios|
            if not helios.is_active
                @statuses[helios.id] = 'inactive'
                @laser_statuses[helios.id] = 'none'
                next
            end

            logger.debug "HelioscontrolController.status: check for ip/name #{helios.host_name}:#{helios.port}"

            begin
                @statuses[helios.id] = 'no_connection'
                @laser_statuses[helios.id] = 'no_connection'

                comms = helios.get_comms
                response = comms.write "<get_fdel_status/>"

                if response.nil?
                    @statuses[helios.id] = 'no_connection'
                elsif response[/process running/]
                    @statuses[helios.id] = 'running'
                elsif response[/No.*process is running/]
                    @statuses[helios.id] = 'not_running'
                else
                    @statuses[helios.id] = 'no_connection'
                end
                logger.info "HeliosController.status: FDEL: #{@statuses[helios.id]}"

                response = comms.write "<get_laser_status/>"
                if response.nil?
                    @laser_statuses[helios.id] = 'no_connection'
                elsif response[/ON/]
                    @laser_statuses[helios.id] = 'laser_on'
                elsif response[/OFF/]
                    @laser_statuses[helios.id] = 'laser_off'
                elsif response[/LOCKED OUT/]
                    @laser_statuses[helios.id] = 'locked_out'
                else
                    @laser_statuses[helios.id] = 'no_connection'
                end
                logger.info "HeliosController.status: LASER: #{@laser_statuses[helios.id]}"
            rescue => ex
                logger.warn "HeliosController.status: #{ex}, #{helios.host_name} may be incomplete"
            end
        end
    end

    # Start a helios unit.
    def start
        security_breach unless can? :restart, :helios_units

        @id = params[:id].to_i
        helios = HeliosUnit.find(@id)
        if not helios
            @error = 'Could not find the helios unit record.'
        else
            begin
                control = HeliosControl.new(helios)
                control.start
                @error = nil
                @status = 'running'
            rescue => ex
                @error = "Could not start the Helios server #{helios.name}, exception=#{ex}."
            end
        end
        render :template => "/monitor/helioscontrol/update_status"
    end

    # Stop a helios unit.
    def stop
        security_breach unless can? :restart, :helios_units
        @id = params[:id].to_i
        helios = HeliosUnit.find(@id)
        if not helios
            @error = 'Could not find the helios unit record.'
        else
            begin
                control = HeliosControl.new(helios)
                control.stop
                @error = nil
                @status = 'not_running'
            rescue => ex
                @error = "Could not stop the Helios server #{helios.name}, exception=#{ex}."
            end
        end
        render :template => "/monitor/helioscontrol/update_status"
    end

	    # Obtain the statuses of all the helios boxes given in the post.
    def laser_status
        heliosUnitIds = params[:helios_unit_ids].split(",").map { |idstr| idstr.to_i }
        heliosUnits = HeliosUnit.where(id: heliosUnitIds)
        @statuses = {}
        heliosUnits.each { |helios|
            if not helios.is_active
                @statuses[helios.id] = 'inactive'
                next
            end

            sock = nil
            logger.debug "HelioscontrolController.status: check for ip/name #{helios.host_name}:#{helios.port}"
            begin
                Timeout::timeout(10) {
                    str = helios.get_comms.write "<get_laser_status/>"
                    str.strip!

                    if str[/^ON$/]
                        @statuses[helios.id] = 'laser_on'
                    elsif str[/^OFF$/]
                        @statuses[helios.id] = 'laser_off'
					elsif str[/^LOCKED OUT$/]
						@statuses[helios.id] = 'locked_out'
					else
						@statuses[helios.id] = str
                    end
                }
            rescue Timeout::Error => ex
                logger.warn "HeliosController.laser.status: #{ex}, skipping #{helios.host_name}"
                @statuses[helios.id] = 'no_connection'
            rescue => ex
                logger.warn "HeliosController.laser.status: #{ex}, skipping #{helios.host_name}"
                @statuses[helios.id] = 'no_connection'
            end
        }
    end

    # Start a helios laser unit.
    def start_laser
        security_breach unless can? :restart, :laser
        @id = params[:id].to_i
        helios = HeliosUnit.find(@id)
        if not helios
            @error = 'Could not find the helios unit record.'
        else
            begin
                control = HeliosControl.new(helios)
                if control.start_laser
                    @status = 'laser_on'
                else
					@status = 'locked_out'
                end
                @error = nil
            rescue => ex
                @error = "Could not start the laser on Helios server #{helios.name}, exception=#{ex}."
            end
        end
        render :template => "/monitor/helioscontrol/update_laser_status"
    end

    # Stop a helios laser unit.
    def stop_laser
        security_breach unless can? :restart, :laser
        @id = params[:id].to_i
        helios = HeliosUnit.find(@id)
        if not helios
            @error = 'Could not find the helios unit record.'
        else
            begin
                control = HeliosControl.new(helios)
                control.stop_laser
                @error = nil
                @status = 'laser_off'
            rescue => ex
                @error = "Could not stop the laser on Helios server #{helios.name}, exception=#{ex}."
            end
        end
        render :template => "/monitor/helioscontrol/update_laser_status"
    end

end
