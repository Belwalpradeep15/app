# FILENAME:     helios_section_location.rb
# AUTHOR:       Karina Simard
# CREATED ON:   10-09-10
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

class HeliosSectionLocation < ApplicationRecord
    belongs_to :helios_unit
    belongs_to :document
end

