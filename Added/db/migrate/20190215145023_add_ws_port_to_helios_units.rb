class AddWsPortToHeliosUnits < ActiveRecord::Migration[5.2]
  def self.up
    add_column :helios_units, :ws_port, :integer, :null => false, :default => 57006
  end

  def self.down
    remove_column :helios_units, :ws_port
  end
end
