# FILENAME:     region_property.rb
# AUTHOR:       Matthew Stuart
# CREATED ON:   2016-11-15
#
# LAST CHANGE:
# $Author$
#   $Date$
#    $Rev$
#    $URL$
#
# COPYRIGHT:
# This file is Copyright (c) 2016 by Fotech Solutions. All rights reserved.



# Description of a region of a fibre.
class RegionProperty < ActiveRecord::Base
  belongs_to :fibre_region

  # Perform a search for the search controller.
  def self.do_find(conditions, options, joins)
    self.where(conditions).join(joins).order(options.order).limit(options.limit)
  end

  # Convert to an XML.
  def to_xml(options = {})
    xml = options[:builder] ||= Builder::XmlMarkup.new(options)

    xml.FibreRegion "region-property-id"=>id do
      xml.References "fibre-region-id" => fibre_region_id
      xml.Key key
      xml.Value value
    end
  end

  # Field mappings as required for the search controller.
  def self.field_mappings
    @@FIELD_MAPPINGS
  end

  # Joins as required for the search controller.
  def self.field_joins
    @@FIELD_JOINS
  end


  private #---------------------------------------------------------------------
  @@FIELD_MAPPINGS = {
      "RegionPropertyId" =>   { :field => 'region_properties.id' },
      "FibreRegionId" =>      { :field => 'region_properties.fibre_region_id' },
      "Key" =>                { :field => 'region_properties.key', :quoted => true },
      "Value" =>              { :field => 'region_properties.value', :quoted => true },
      "OwnerId" =>            { :field => 'fl.owner_id' }
  }

  @@FIELD_JOINS = {
  }
end