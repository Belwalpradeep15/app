class AlarmSuppressionProcessEventSqlChanges < ActiveRecord::Migration[5.2]
  def self.up
    execute File.read('db/procedures/process_event.11.sql')
  end

  def self.down
    # We have missed a backup between 10 and 11.
    # Someone forgot to create it when updating the stored proc.
    # This is OK for now.
  end
end
