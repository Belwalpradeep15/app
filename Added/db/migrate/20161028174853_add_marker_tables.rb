class AddMarkerTables < ActiveRecord::Migration[5.2]
  def self.up
    create_table :markers do |t|
        t.string  :name, :null => false
        t.string  :description
        t.references :organization, :null => false
        t.timestamps
    end

    execute "SELECT AddGeometryColumn('markers', 'gis_location', -1, 'POINT', 2)"
    execute "ALTER TABLE markers ADD CONSTRAINT markers_geometry CHECK (ST_IsValid(gis_location))"

    add_foreign_key :markers, :organizations

    create_table :marker_types do |t|
        t.string  :name, :null => false
        t.boolean :locked
        t.string  :icon_path, :null => false
        t.timestamps
    end

    create_table :markers_marker_types do |t|
        t.integer :marker_type_id
        t.integer :marker_id
        t.timestamps
    end

    add_foreign_key :markers_marker_types, :markers
    add_foreign_key :markers_marker_types, :marker_types

    create_table :locations do |t|
        t.float :location_x
        t.float :location_y
        t.references :document, :null => false
        t.references :marker, :null => false
    end

    add_foreign_key :locations, :documents
    add_foreign_key :locations, :markers


  end

  def self.down
    drop_table :markers_marker_types
    drop_table :marker_types
    drop_table :locations
    drop_table :markers
  end
end
