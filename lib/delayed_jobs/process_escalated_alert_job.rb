#  process_escalated_alert_job.rb
#  panoptes
#
#  Created by Steven W. Klassen on 2013-05-31.
#  Copyright (c) 2013 Fotech Solutions (Canada) Ltd. All rights reserved.

module DelayedJobs

    # Delayed job to process an escalated alert.
    class ProcessEscalatedAlertJob
        def initialize(alertId)
            @alertId = alertId
        end
        
        def perform
            ActiveRecord::Base::transaction do
                ae = AlertEngine.new(@alertId, Delayed::Worker.logger)
                ae.process_escalated_alert()
                ae.call_respond_listeners()
            end
        end
    end

end
