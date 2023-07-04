class AddInitialThreatLevel < ActiveRecord::Migration[5.2]
  def self.up
    add_column :threat_configurations, :initial_threat_level, :string, :length => 20, :null => false, :default => 'clear'
  end

  def self.down
    remove_column :threat_configurations, :initial_threat_level
  end
end
