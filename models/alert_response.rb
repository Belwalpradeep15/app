# FILENAME:     alert_response.rb
# AUTHOR:       Steven Klassen
# CREATED ON:   2010-08-03
# 
# DESCRIPTION:  References a single response to an alert.
#
# LAST CHANGE:
# $Author$
#   $Date$
#    $Rev$
#    $URL$
#
# COPYRIGHT:
# This file is Copyright © 2010 Fotech Solutions Ltd. All rights reserved.


class AlertResponse < FotechActiveRecord
    belongs_to :alert
    belongs_to :user
end
