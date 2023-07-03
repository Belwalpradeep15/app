# FILENAME:     documents_reference_point.rb
# AUTHOR:       Karina Simard
# CREATED ON:   10-09-12
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

class DocumentsReferencePoint < ApplicationRecord
    belongs_to :document
    belongs_to :reference_point
end

