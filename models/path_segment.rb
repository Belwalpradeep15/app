# $Author$
#   $Date$
#    $Rev$
#    $URL$
#
# COPYRIGHT:
# This file is Copyright © 2016 Fotech Solutions Ltd. All rights reserved.

class PathSegment < ApplicationRecord
  belongs_to :fibre_line, foreign_key: :fibre_line_id
  belongs_to :path, foreign_key: :path_id
end
