# FILENAME:     process_multiple_alerts_job.rb
# AUTHOR:       Steven Klassen
# CREATED ON:   2010-12-01
# 
# DESCRIPTION:  
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

    # Delayed job to process multiple alerts, either new or modified.
    class ProcessMultipleAlertsJob
        def perform
            if @newAlertIds and @newAlertIds != ""
                @newAlertIds.split(',').each do |id|
                    ActiveRecord::Base.transaction do
                        ae = AlertEngine.new(id.to_i, Delayed::Worker.logger)
                        ae.process_incoming_alert()
                        ae.call_generate_listeners()
                    end
                end
            end
            
            if @existingAlertIds and @existingAlertIds != ""
                @existingAlertIds.split(',').each do |id| 
                    ActiveRecord::Base.transaction do
                        ae = AlertEngine.new(id.to_i, Delayed::Worker.logger)
                        ae.process_merged_alert()
                        ae.call_respond_listeners()
                    end
                end
            end
        end
    end
end


