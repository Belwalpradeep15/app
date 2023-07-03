# $Author$
# $Date$
# $Rev$
# $URL$
#
# COPYRIGHT:
# This file is Copyright (c) 2009 Fotech Solutions Ltd. All rights reserved.

class Monitor::SessionController < MonitorController

    skip_before_action :set_locale
    skip_before_action :authenticate

    # Logout the user.
    def logout
        # Calling without parameters renders the logout page.
        @includeScript = false
        @suppressUser = true
        session[:current_user] = '__logout'
        redirect_to '/'
    end

    # Login the user. This isn't strictly necessary (it is the same as a logout)
    # but it reads a little nicer in the URL.
    def login
      redirect_to :action => 'logout'
    end
end
