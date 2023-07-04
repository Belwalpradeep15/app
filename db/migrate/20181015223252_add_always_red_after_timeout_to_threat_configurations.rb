class AddAlwaysRedAfterTimeoutToThreatConfigurations < ActiveRecord::Migration[5.2]
  def self.up
    add_column :threat_configurations, :always_red_after_timeout_enabled, :boolean, :default => false, :null => false
    add_column :threat_configurations, :always_red_after_timeout_s, :float, :null => false, :default => 600.0
  end

  def self.down
    remove_column :threat_configurations, :always_red_after_timeout_enabled
    remove_column :threat_configurations, :always_red_after_timeout_s
  end
end
