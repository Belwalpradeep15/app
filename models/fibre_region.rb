# FILENAME:     fibre_region.rb
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



# Description of a region of a fibre.
class FibreRegion < ApplicationRecord
    belongs_to :fibre_line
    belongs_to :fibre_region_type

    has_many :properties, :class_name => "RegionProperty", :dependent => :delete_all

    validates_presence_of   :starting_position
    validates_presence_of   :length

	#helios zones can be negative since they are relative to a zero point
    validates_numericality_of   :starting_position #, :greater_than_or_equal_to => 0.0
    validates_numericality_of   :length, :greater_than_or_equal_to => 0.0

    # Perform a search for the search controller.
    def self.do_find(conditions, options, joins)
        self.where(conditions).joins(joins).order(options.order).limit(options.limit)
    end

    def self.get_accessible_regions(current_user_id)
        return find_by_sql <<-SQL
              SELECT *, * FROM fibre_regions fr, fibre_lines fl
              INNER JOIN organizations_users ou ON fl.owner_id = ou.organization_id
              where ou.user_id = '#{current_user_id}';
            SQL
    end

    def region_properties
        default = {
            :highlight_colour => '',
            :highlight_opacity => '',
            :highlight_width => ''
        }

        default.merge Hash[self.properties.map{ |p| [p[:key].to_sym, p[:value]] }]
    end
    
    def set_properties(props)
        properties.destroy_all
        props.each do |k,v|
            self.properties << RegionProperty.create({:key => k.to_s.strip, :value => v.strip})
        end
    end
    
    def add_property(k, v = nil)
        if v.nil? and k.is_a? Hash
            v = k.values.first
            k = k.keys.first
        end

      raise "Expected strings for key and value arguments" unless k.is_a?(String) and v.is_a?(String)

      properties.create [{:key => k, :value => v}]
    end

    def ending_position
        self.starting_position + self.length
    end

    def contains_position?(position)
        self.starting_position <= position and position <= self.ending_position
    end

    # Convert to an XML.
    def to_xml(options = {})
        xml = options[:builder] ||= Builder::XmlMarkup.new(options)

        xml.FibreRegion "fibre-region-id"=>id do
            xml.References "fibre-line-id"=>fibre_line_id, "fibre-region-type-id"=>fibre_region_type_id
            xml.StartingPosition starting_position
            xml.Length length
            xml.Description description unless description.nil?
            xml.SymbolName symbol_name unless symbol_name.nil?
            xml.Route "TODO: finish this"
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
        "FibreRegionId" =>      { :field => 'fibre_regions.id' },
        "FibreLineId" =>        { :field => 'fibre_regions.fibre_line_id' },
        "FibreRegionTypeId" =>  { :field => 'fibre_regions.fibre_region_type_id' },
        "FibreRegionTypeName" => { :field => 'frt.name', :quoted => true },
        "StartingPosition" =>   { :field => 'fibre_regions.starting_position' },
        "Length" =>             { :field => 'fibre_regions.length' },
        "Description" =>        { :field => 'fibre_regions.description', :quoted => true },
        "SymbolName" =>         { :field => 'fibre_regions.symbol_name', :quoted => true },
        "Visible" =>         { :field => 'fibre_regions.visible' },
        "OwnerId" =>            { :field => 'fl.owner_id' }
    }

    @@FIELD_JOINS = {
        "FibreRegionTypeName" => %{INNER JOIN fibre_region_types frt ON frt.id = fibre_regions.fibre_region_type_id},
        "OwnerId" => %{INNER JOIN fibre_lines fl ON fl.id = fibre_regions.fibre_line_id}
    }
end
