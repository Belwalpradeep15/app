# Darren Taylor
# 2018-01-23
# v0.1
# Licenses controller /monitor/licenses
#
# COPYRIGHT:
# This file is Copyright (c) 2018 Fotech Solutions Ltd. All rights reserved.
#
require 'json'

class LicensesController < ApplicationController
	# No serious actions here, just a simple GET control which returns the licenses used
	# for the software in question.
	#
	# This list of licenses is supplied to the system in a simple JSON format and
	# can be parsed directly.
	
    def show
	
	@licenses = [ "" ]
	filename = SYSTEM_CONFIG['licenses_file']

	begin
		file = File.read( filename);
		@licenses = JSON.parse(file)
		@licenses = @licenses.sort { | a, b | a['name'] <=> b['name'] }
	rescue
		logger.error "Was unable to read the file " + filename
	end

	render :layout => false, :template => 'licenses/licenses'
    end
end
	


