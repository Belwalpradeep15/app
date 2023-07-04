class AddEventTypeColumns < ActiveRecord::Migration[5.2]
  def self.up
    add_column :event_types, :description, :string, :length => 100, :null => true
    add_column :event_types, :image_file, :string, :length => 255, :null => true
  end

  def self.down
    remove_column :event_types, :description
    remove_column :event_types, :image_file
  end
end
