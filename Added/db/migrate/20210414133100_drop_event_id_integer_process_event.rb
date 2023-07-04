class DropEventIdIntegerProcessEvent < ActiveRecord::Migration[5.2]
  def self.up
    execute <<-SQL
      DROP FUNCTION IF EXISTS fotech_process_event(integer, character varying);
    SQL
  end
end
