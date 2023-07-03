# $Author$
#   $Date$
#    $Rev$
#    $URL$
#
# COPYRIGHT:
# This file is Copyright (c) 2008 by Fotech Solutions. All rights
# reserved.

class EventCategory < ApplicationRecord
  has_and_belongs_to_many :apps
  has_many :event_types
  has_and_belongs_to_many :fibre_lines
end
