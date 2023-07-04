class UpdateEventsIdBigint < ActiveRecord::Migration[5.2]
  def self.up
    execute <<-SQL
      ALTER TABLE events
      ALTER COLUMN id TYPE bigint;
    SQL
  end

  def self.down
    # We can actually go down...
    # but if the value have crossed 32-bit limit we might fail.
    #
    raise "Unsupported rollback: converting col from bigint to integer."
  end
end
