class RemoveDeprecatedTables < ActiveRecord::Migration[5.2]
  def self.up
    drop_table      :colour_maps

    drop_table      :configurations_property_groups
    drop_table      :configurations

    drop_table      :fibre_line_properties
    drop_table      :fibre_line_properties_groups

    remove_column   :fibre_lines, :redundancy_offset
    drop_table      :fibre_redundancies

    drop_table      :prf_references

    remove_column   :fibre_regions, :property_group_id
    drop_table      :properties
    drop_table      :property_groups
    drop_table      :property_group_types

    # See #20887.
    # This table was inadvertently dropped. So, it is now commented.
    #
    #drop_table      :region_properties
    #
    # As we are still in the development phase, only a few development machines are affected.
    #
    # In order to repair this, another future migration ReinstateDeprecatedRegionPropertiesTable has been added
    # to reinstate the table back.

  end

  def self.down
    # Not bothering with adding reversing this migration.
  end
end
