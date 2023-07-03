# FILENAME:     fibre_region_type.rb
# AUTHOR:       Steven Klassen
# CREATED ON:   2009-02-05
#
# LAST CHANGE:
# $Author$
#   $Date$
#    $Rev$
#    $URL$
#
# COPYRIGHT:
# This file is Copyright (c) 2009 by Fotech Solutions. All rights
# reserved.


# Description of a type of a fibre region.
class FibreRegionType < ApplicationRecord

    validates_presence_of   :name
    validates_presence_of   :description

    # Perform a search for the search controller.
    def self.do_find(conditions, options, joins)
        self.where(conditions).joins(joins).order(options.order).limit(options.limit)
    end

    # Convert to an XML.
    def to_xml(options = {})
        xml = options[:builder] ||= Builder::XmlMarkup.new(options)

        xml.FibreRegionType "fibre-region-type-id"=>id do
            xml.Name name
            xml.Description description
            xml.SymbolName symbol_name if !symbol_name.nil?
        end
    end

    # Field mappings as required for the search controller.
    def self.field_mappings
        @@FIELD_MAPPINGS
    end

    # No joins are needed.
    def self.field_joins
        @@FIELD_JOINS
    end

  private
    @@FIELD_MAPPINGS = {
        "FibreRegionTypeId" => { :field => :id },
        "Name"              => { :field => :name, :quoted => true },
        "Description"       => { :field => :description, :quoted => true },
        "SymbolName"        => { :field => :symbol_name, :quoted => true }
    }

    @@FIELD_JOINS = {}
end



