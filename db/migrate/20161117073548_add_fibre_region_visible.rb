# LAST CHANGE:
# $Author: $
#   $Date: $
#    $Rev: $
#    $URL: $
#
# COPYRIGHT:
# This file is Copyright (c) 2016 Fotech Solutions Ltd. All rights reserved.

class AddFibreRegionVisible < ActiveRecord::Migration[5.2]
  def self.up
    add_column :fibre_regions, :visible, :boolean, :null => false, :default => false
  end
  
  def self.down
    remove_column :fibre_regions, :visible
  end
end