# FILENAME:     set_db_defaults.rb
# AUTHOR:       Steven Klassen
# CREATED ON:   2011-06-03
#
# DESCRIPTION:  This file removes any database items that should not be there if various
#               components are not enabled.
#
# LAST CHANGE:
# $Author$
#   $Date$
#    $Rev$
#    $URL$
#
# COPYRIGHT:
# This file is Copyright © 2011 Fotech Solutions Ltd. All rights reserved.

begin
rescue => ex
    # This occurs if the DB hasnt been created yet, for example, during the first install.
    # We ignore the error.
    RAILS_DEFAULT_LOGGER.error ex.message
end

