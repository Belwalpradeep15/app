class UpdateEventTagsEventIdBigint < ActiveRecord::Migration[5.2]
  def self.up
    execute <<-SQL
      ALTER TABLE event_tags
      ALTER COLUMN event_id TYPE bigint;

      DROP INDEX IF EXISTS event_tags_by_event_id;
      CREATE INDEX event_tags_by_event_id ON event_tags(event_id);
    SQL
  end

  def self.down
    # We can actually go down...
    # but if the value have crossed 32-bit limit we might fail.
    #
    raise "Unsupported rollback: converting col from bigint to integer."
  end
end
