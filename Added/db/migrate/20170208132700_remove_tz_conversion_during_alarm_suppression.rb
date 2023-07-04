# LAST CHANGE:
# $Author: $
#   $Date: $
#    $Rev: $
#    $URL: $
#
# COPYRIGHT:
# This file is Copyright (c) 2013 Fotech Solutions Ltd. All rights reserved.

class RemoveTzConversionDuringAlarmSuppression < ActiveRecord::Migration[5.2]
  def self.up
    execute File.read('db/procedures/process_event.11.sql')
  end

  def self.down
    # This is the first migration for the process_event stored proc since the new recreate_structure.
    # So this down will go back to what the database will have if a fresh reset was done.
    execute File.read('db/procedures/process_event.10.sql')
  end
end
