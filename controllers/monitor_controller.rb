# $Author: aaronrustad $
# $Date: 2009-09-01 12:23:48 -0600 (Tue, 01 Sep 2009) $
# $Rev: 1260 $
# $URL: https://hockleyd.homeunix.net/svn/trunk/app/monitor/monitor-rails/app/controllers/application_controller.rb $
#
# COPYRIGHT:
# This file is Copyright (c) 2009 Fotech Solutions Ltd. All rights reserved.

# Filters added to this controller apply to all controllers in the application.
# Likewise, all the methods added will be available for all controllers.
class MonitorController < ApplicationController
  helper :all # include all helpers, all the time

  # See ActionController::RequestForgeryProtection for details
  # Uncomment the :secret if you're not using the cookie session store
  protect_from_forgery # :secret => '17f02405559ed0f46691a754c954a6f6'
  
  # See ActionController::Base for details 
  # Uncomment this to filter the contents of submitted sensitive data parameters
  # from your application log (in this case, all fields with names like "password"). 
  # filter_parameter_logging :password
  
    def in_role?(role)
      current_user.in_role? role
    end

    # Format the geospatial bounds into a suitable polygon. This assumes that the starting
    # string is of the form ((lat1, long1), (lat2, long2)) which is what GLatLngBnds will
    # output. Note that this operation is destructive to the original string.
    def format_coordinates(coords)
        vals = coords.gsub!(/[() ]/, "").split(",")
        "#{vals[0]},#{vals[1]}:#{vals[0]},#{vals[3]}:#{vals[2]},#{vals[3]}:#{vals[2]},#{vals[1]}"
    end
end

