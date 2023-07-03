#  panoptes_controller.rb
#  panoptes
#
#  Created by Karina Simard on 2013-09-25.
#  Copyright (c) 2013 Fotech Solutions (Canada) Ltd. All rights reserved.
class Admin::PanoptesController < AdminController
	before_action :security_check

	def restart_services
		logger.info "Services restart requested by '#{current_user.loginname}' (#{current_user.id})"
		pid = Process.fork { exec 'sudo panoptes restart' }
		Process.detach(pid)
		logger.info 'Services restart in progress'
		render :text => 'Services restart in progress'
	end

  def restart_system
    logger.info "Panoptes restart requested by '#{current_user.loginname}' (#{current_user.id})"
    pid = Process.fork { exec 'sudo reboot' }
    Process.detach(pid)
    logger.info 'Panoptes restart in progress'
    render :text => 'Panoptes restart in progress'
  end

  private

	# Perform our permissions checks.
	def security_check
		security_breach unless can? :restart, :panoptes_unit
	end

end
