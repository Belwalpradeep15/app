class RemoveMoreDeprecatedTables < ActiveRecord::Migration[5.2]
  def self.up
    drop_table      :channels
    drop_table      :fibre_shots
    drop_table      :time_series

  end

  def self.down
    # Not bothering with adding reversing this migration.
  end
end
