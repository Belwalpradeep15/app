class RemovePortFromPanoptesUnits < ActiveRecord::Migration[5.2]
  def up
    remove_column :panoptes_units, :port, :integer
  end
 
  def down
    add_column :panoptes_units, :port, :integer
  end
end
