class ReinstateDeprecatedRegionPropertiesTable < ActiveRecord::Migration[5.2]
    def up
        # See #20887.
        # This is optionally reinstating the region_properties table
        # which might have been inadvertently dropped in RemoveDeprecatedTables migration.
        execute <<-sql
            CREATE TABLE IF NOT EXISTS region_properties
(
  id serial NOT NULL,
  fibre_region_id integer,
  key character varying(255),
  value character varying(255),
  created_at timestamp without time zone NOT NULL,
  updated_at timestamp without time zone,
  CONSTRAINT region_properties_pkey PRIMARY KEY (id),
  CONSTRAINT fk_region_properties_fibre_region_id FOREIGN KEY (fibre_region_id)
      REFERENCES fibre_regions (id) MATCH SIMPLE
      ON UPDATE NO ACTION ON DELETE NO ACTION
)

        sql
    end

    def down
        # Do nothing.
    end
end
