class MakeMarkerAndMarkerTypeNamesUnique < ActiveRecord::Migration[5.2]
  def self.up
    add_index(:markers, :name, :unique => true)
    add_index(:marker_types, :name, :unique => true)
  end

  def self.down
    remove_index(:markers, :name)
    remove_index(:marker_types, :name)
  end
end
