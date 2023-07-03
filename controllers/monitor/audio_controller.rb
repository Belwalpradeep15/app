# COPYRIGHT:
# This file is Copyright (c) 2018 Fotech Solutions Ltd. All rights reserved.

class Monitor::AudioController < MonitorController

    skip_before_action :set_locale
    skip_before_action :authenticate

    def play
        # Load the parameters we were given
        helios_hostname = params[:hostname]
        session_id = params[:id]
        title = params[:title]
        start_m = params[:start]
        end_m = params[:end]

        render :partial => 'monitor/audio/play', :locals => {
                                                    :helios_hostname => helios_hostname,
                                                    :session_id => session_id,
                                                    :title => title,
                                                    :end_m => end_m,
                                                    :start_m => start_m,
                                                }
    end
end