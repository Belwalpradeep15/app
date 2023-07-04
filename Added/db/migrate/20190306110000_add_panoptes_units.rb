class AddPanoptesUnits < ActiveRecord::Migration[5.2]
  # Add the Panoptes units table.
  def self.up
    create_table :panoptes_units, :force => true do |t|
      t.string "name", :null => false, :limit => 255
      t.string "serial_number", :null => false, :limit => 50
      t.string "host_name", :null => false, :limit => 50
      t.integer "port", :null => false, :limit => 4
      t.timestamps
    end

    change_column :panoptes_units, "created_at", :datetime, :null => false
    add_index :panoptes_units, :serial_number, :unique => true, :name => 'panoptes_units_unique_serial_number'
    add_column :panoptes_units, :is_active, :boolean, :null => false, :default => true
    add_column :panoptes_units, :uuid, :string, :null => false, :limit => 36
    execute "SELECT AddGeometryColumn('panoptes_units', 'location', -1, 'POINT', 2)"
    execute "ALTER TABLE panoptes_units ADD CONSTRAINT panoptes_units_geometry CHECK (ST_IsValid(location))"
    add_column :panoptes_units, :ws_port, :integer, :null => false, :default => 57006
    execute "CREATE INDEX index_on_panoptes_units_lower_name ON panoptes_units(LOWER(name))"

  end

  def self.down
    remove_column :panoptes_units, :is_active
    execute "SELECT DropGeometryColumn('panoptes_units','location')"
    remove_index :panoptes_units, :name => :panoptes_units_unique_serial_number
    remove_column :panoptes_units, :uuid
    remove_column :panoptes_units, :ws_port
    remove_index :panoptes_units, :name => 'index_on_panoptes_units_lower_name'
    drop_table :panoptes_units
  end
end
