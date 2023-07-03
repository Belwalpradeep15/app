# FILENAME:     notification.rb
# AUTHOR:       Steven Klassen
# CREATED ON:   2009-03-18
# 
# LAST CHANGE:
# $Author$
#   $Date$
#    $Rev$
#    $URL$
#
# COPYRIGHT:
# This file is Copyright (c) 2009 by Fotech Solutions. All rights
# reserved.

class Notification < FotechActiveRecord
    has_one     :notification_trigger
    has_many    :notification_agents
end
