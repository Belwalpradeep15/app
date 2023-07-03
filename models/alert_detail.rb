# FILENAME:     alert_detail.rb
# AUTHOR:       Steven Klassen
# CREATED ON:   2010-08-03
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



class AlertDetail < FotechActiveRecord
    belongs_to :alert
    
    # Convenience constructor that takes a key and value.
    def self.create(k, v, visible = true)
        det = AlertDetail.new()
        det.key = k
        det.value = v
        det.visible = visible
        return det
    end

end
