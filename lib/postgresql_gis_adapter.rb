class ActiveRecord::ConnectionAdapters::PostgreSQLAdapter
  def native_database_types #:nodoc:
    {
      :primary_key => "serial primary key",
      :string      => { :name => "character varying", :limit => 255 },
      :text        => { :name => "text" },
      :integer     => { :name => "integer" },
      :float       => { :name => "float" },
      :decimal     => { :name => "decimal" },
      :datetime    => { :name => "timestamp" },
      :timestamp   => { :name => "timestamp" },
      :time        => { :name => "time" },
      :date        => { :name => "date" },
      :binary      => { :name => "bytea" },
      :boolean     => { :name => "boolean" },
      # Custom fields
      :real        => { :name => "real" },
      :float_array => { :name => "double precision[]" }
    }
  end
end
