# $Author$
# $Date$
# $Rev$
# $URL$
#
# COPYRIGHT:
# This file is Copyright © 2009 Fotech Solutions Ltd. All rights reserved.


module Monitor::MainHelper

    # Converts a collection of permissions into an array of strings that can be used by
    # the javascript to create the permissions hash.
    def permissions_for_javascript(permissions)
        perms = []
        permissions = permissions[:can]
        permissions.each { |permission|
            action = permission[0].to_s.camelize
            obs = permission[1]

            obs.each { |ob|
                perms << "can#{action}#{ob.to_s.camelize}"
            }
        }
        return perms
    end

end
