# FILENAME:     process_alert_job.rb
# AUTHOR:       Steven Klassen
# CREATED ON:   2010-08-19
# 
# LAST CHANGE:
# $Author$
#   $Date$
#    $Rev$
#    $URL$
#
# COPYRIGHT:
# This file is Copyright © 2010 Fotech Solutions Ltd. All rights reserved.

module DelayedJobs

    # Delayed job to process an incoming alert. This is essentially a wrapper around
    # the process_incoming_alert method of the AlertEngine class.
    class ProcessAlertJob

        def initialize(alertId)
            @alertId = alertId
        end
        
        def perform
            ActiveRecord::Base.transaction do
                ae = AlertEngine.new(@alertId, Delayed::Worker.logger)
                ae.process_incoming_alert()
                ae.call_generate_listeners()
            end
        end
    end

end
