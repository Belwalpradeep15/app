# $Author: sklassen $
#   $Date: 2009-05-21 08:21:22 -0600 (Thu, 21 May 2009) $
#    $Rev: 1000 $
#    $URL: https://hockleyd.homeunix.net/svn/trunk/app/gcrepository-rails/app/models/xml_support.rb $
#
# COPYRIGHT:
# This file is Copyright (c) 2009 by Fotech Solutions. All rights
# reserved..
require 'rexml/xpath'

# This module provides classes and methods that support various requirements for dealing with XML
# and the application's models.
module XmlSupport

  # Manages searches based on XML documents that are submitted. For exact (or close to) specification
  # for XML format, please consult the Repository API
  class Search

    # Takes an XML Search document and returns a collection of Targets, fully
    # populated with ActiveRecord results
    def self.search_from_xml(xml)
      search_doc = SearchXmlDocument.create(xml)

      search_doc.collect { |target| target.find; target }
    end
  end

  # Provides a unified interface for Filter elements that are parsed from the XML Search document
  class Filter < Hash
    attr_writer :field_mappings
    attr_writer :field_joins

    # Generates a condition for the Filter in the format that ActiveRecord can use as
    # it's condition argument.
    def condition
        "#{field} #{operation} #{params}"
    end

    # If a Model defines FIELD_JOINS (accessible via Model.field_joins), and this is
    # is a filter that requires advanced JOINs, it will return the appropriate join
    # and make it available to the Model. This is used when ActiveRecord can't provide the
    # complex JOINS needed to fill the requirements of the application.
    # Ideally, you wouldn't need this, and you should try (with all your might) to not
    # depend on this, however, you might.
    def joins
      @field_joins[self[:field]]
    end

    # Returns an array of value objects parsed from the text of the element.
    def values
      @values ||= text.split(',')
    end

    # Returns a string representation of the filter values formatted properly
    # for insertion into standard SQL.
    def params
        if self[:operation] == "IS_NULL" or self[:operation] == "IS_NOT_NULL"
            return ""
        end

        if spatial?
            return "ST_GeomFromText('POLYGON((#{text_as_gis_coords}))')"
        end

        prefix = ""
        suffix = ""
        if self[:operation] == 'IN'
            prefix = "("
            suffix = ")"
        end

        vals = values
        if time?
            vals = values.collect { |value| "'" + FotechXML.formatTime(Time.xmlschema(value)) + "'" }
        elsif quoted?
            vals = values.collect { |value| "'" + escape_sql(value.to_s) + "'" }
        end

        return prefix + vals.join(',') + suffix
    end

    private
        # Escape any SQL special characters.
        def escape_sql(str)
        str.gsub!(/[']/) do | match |      # ' get around xcode highliting problem
            case match
            when "'" then "''"
            end
        end
        return str
        end

      def quoted?
        @quoted ||= field_attribute(:field, :quoted)
      end

      def text
        @text ||= self[:text]
      end

      # Return the text but reformatted as coordinates suitable for PostGIS.
      def text_as_gis_coords
        coords = []
        text.split(":").each { |coord|
            ll = []
            coord.split(",").each { |l| ll << l }
            coords << "#{ll[1]} #{ll[0]}"
        }
        coords << coords[0]
        coords.join(",")
      end

      # Returns true if the field is a time value.
      def time?
        @time = field_attribute(:field, :isTime)
      end

      def field
        @field ||= field_attribute(:field, :field)
      end

      # Returns true if the field is a spatial value.
      def spatial?
        @spatial ||= field_attribute(:field, :isSpatial)
      end

      # Returns the SQL operator.
      def operation
        if spatial?
            @operation ||= @@SPATIAL_OPERATOR_MAPPING[self[:operation]]
        else
            @operation ||= @@OPERATOR_MAPPING[self[:operation]]
        end
      end

      @@OPERATOR_MAPPING = { "EQUALS"                 => "=",
                             "IN"                     => "IN",
                             "GREATER_THAN"           => ">",
                             "GREATER_THAN_OR_EQUALS" => ">=",
                             "LESS_THAN"              => "<",
                             "LESS_THAN_OR_EQUALS"    => "<=",
                             "IS_NULL"                => "IS NULL",
                             "IS_NOT_NULL"            => "IS NOT NULL"
                           }

      # Note that we don't provide the less than, etc. operators. These could be defined
      # in terms of "north of" or "west of", etc., but we would have to decide what we
      # would want these to mean.
      @@SPATIAL_OPERATOR_MAPPING = {
        "EQUALS"                    => "=",
        "IN"                        => "@",
        "IS_NULL"                   => "IS NULL",
        "IS_NOT_NULL"               => "IS NOT NULL"
      }

      private
        def field_attribute(field, attribute)
          @field_mappings[self[field]][attribute]
        end
  end


  # A convenience class that provides access the options elements
  class Options < Hash
    attr_writer :field_mappings

    # Returns true if the field should be added to the output and false otherwise.
    def add?(field)
        opts = self[:Add]
        if !opts.nil?
            opts.each { |opt| return true if (opt and opt[:field] == field) }
        end
        return false
    end

    # Returns an object describing the encoding if the field should be encoded and nil
    # otherwise. If the returned object is not nil it will be a hash containing :type
    # describing the type of encoding to be used. Other items in the hash will depend
    # on the value of :type. Currently supported are the following:
    #  :type="gmap" - will contain the additional fields :num-levels and :zoom-factor
    def encode_polygon(field)
        opts = self[:EncodePolygon]
        if opts
            opts.each { |opt|
                if opt[:field] == field
                    return opt
                end
            }
        end
        return nil
    end

    # Returns the maximum number of rows to be returned or nil if no such limit has been set.
    def limit
        opts = self[:Limit]
        opts.nil? ? nil : opts[0][:rows]
    end

    # Returns the SQL snippet required to implement the order or nil if no order
    # has been specified.
    def order
        opts = self[:Order]
        return nil if opts.nil?

        sql = ""
        opts.each { |opt|
            fieldMapping = @field_mappings[opt[:field]]
            if fieldMapping
                sql.concat(", ") if sql != ""
                sql.concat(fieldMapping[:field].to_s)
                sql.concat(" DESC") if opt[:descending] == 'true'
            end
        }

        return nil if sql == ""
        return sql
    end

    # Returns true if the given field should be suppressed.
    def suppress?(field)
        opts = self[:Suppress]
        if !opts.nil?
            opts.each { |opt| return true if (opt and opt[:field] == field) }
        end
        return false
    end
  end

  # This is a wrapper class for an XML document. Its purpose is to encapsulate the complexities of
  # dealing with the XML. It really is a dumb class with very limited functionality. The best it can
  # do is access text from an element attributes. It makes no attempt do type conversions. Everything
  # returned is a String.
  class XmlDocument
    include REXML
    attr_reader :doc

    def name
      @doc.name
    end

    def self.create(xml)
      XmlDocument.new(Document.new(xml).root)
    end

    def initialize(doc)
      @doc = doc
    end

    def method_missing(method, *args)
      ns = definitions[name][:ns]
      el = element(method)
      if el
        el.has_text? ? el.text : el.attributes
      else
        nil
      end
    end

    # Return the element specified by the given definition as opposed to the text of the element.
    def element(definition)
        path = definitions[name][definition]
        raise "Undefined XML path for #{definition}" if path.nil?
        XPath.first(@doc, path, definitions[name][:ns])
    end

    # Return all the elements specified by the given definition.
    def elements(definition)
        ns = definitions[name][:ns]
        path = definitions[name][definition]
        raise "Undefined XML path for #{definition}" if path.nil?
        XPath.match(@doc, path, definitions[name][:ns])
    end

    def definitions
      @definitions ||= DEFINITIONS
    end

    private
      # DEFINITIONS define a given document with the namespaces and paths for various items of the XML
      # document. If you need to add a new document, follow the format of the others.
      DEFINITIONS = { "EventSubmit" => {
                                    :ns => { 'r' => 'http://www.fotechsolutions.com/schemas/repository-0.1.xsd',
                                             't' => 'http://www.fotechsolutions.com/schemas/types-0.1.xsd' },
                                    :source => "//r:Identification/r:Source",
                                    :time => "//t:Event/t:Time",
                                    :distance_on_line => "//t:Event/t:Location/t:DistanceOnLine",
                                    :width => "//t:Event/t:Location/t:Width",
                                    :velocity => "//t:Event/t:Location/t:Velocity",
                                    :acceleration => "//t:Event/t:Location/t:Acceleration",
                                    :magnitude => "//t:Event/t:Magnitude",
                                    :event_type => "//t:Event/t:EventType"
                                  },
                  "AlertSubmit" => {
                        :ns => { 'r' => 'http://www.fotechsolutions.com/schemas/repository-0.1.xsd',
                                 't' => 'http://www.fotechsolutions.com/schemas/types-0.1.xsd' },
                        :alert_name => "/r:AlertSubmit/t:Alert/t:Name",
                        :comments => "/r:AlertSubmit/t:Alert/t:Comments",
                        :organization => "/r:AlertSubmit/r:Identification/r:Organization",
                        :source => "/r:AlertSubmit/r:Identification/r:AlertSource",
                        :details => "/r:AlertSubmit/t:Alert/t:Detail"
                        }

               }
  end

  # This class is a wrapper for Search XML document. It provides a simplified object abstraction and an Enumerable
  # list of Target derived from parsing the document.
  class SearchXmlDocument < XmlDocument
    include Enumerable

    def self.create(xml)
      SearchXmlDocument.new(Document.new(xml).root)
    end

    def initialize(doc)
      super(doc)
    end

    def size
      @doc.root.elements.size
    end

    def each
      XPath.each(@doc, "//Search/Target") do |element|
        yield Target.new(element)
      end
    end
  end

  # Search XML Documents contain a number of Target object that define how to search for various models.
  # Target creates an object view of the Target XML, parsing out Filters and Options, as well as
  # providing a find method that calls on the Model.
  class Target
    attr_reader:id, :type, :filters, :results

    # Requires an REXML::Element, starting at Target tag.
    def initialize(element)
      @id = element.attributes["id"]
      @type = eval(element.attributes["type"])
      @options, @filters = Options.new,[]
      populate_options(element)
      populate_filters(element)
    end

    # Generates and returns a string describing all the filters for the target.
    def conditions
        filters.collect { |filter| filter.condition }.join(' AND ')
    end

    # A Hash of Options
    def options
      @options
    end

    def joins
      filters.collect {|filter| filter.joins}.join(' ')
    end

    # Calls do_find on the model object that is defined as part of this target
    def find
      @results = @type.do_find(conditions, options, joins)
    end

    def size
      @results.size
    end

    private
      # Iterates over each Option of the Target XML and creates and adds them to the Options.
      def populate_options(element)
        element.elements.each("Options/*") do |option|
          option_struct = Hash.new
          option.attributes.each do |name, value|
            option_struct[name.to_sym] = value
          end
          add_option(option.name.to_sym, option_struct)
        end
        @options.field_mappings = @type.field_mappings
      end

      # Add an option. If the option already exists the new one will be added to the array.
      def add_option(optionSym, optionStruct)
        currStructs = @options[optionSym]
        if currStructs.nil?
            currStructs = []
            @options[optionSym] = currStructs
        end
        currStructs << optionStruct
      end

      # Iterates over each Filter defined in the Target XML and creates a number of Filter objects.
      def populate_filters(element)
        element.elements.each("Filters/*") do |filter|
          if filter.name == "Filter"
              filter_object = Filter.new
              filter.attributes.each do |name, value|
                filter_object[name.to_sym] = value
              end
              filter_object[:text] = filter.text
              filter_object.field_mappings = @type.field_mappings
              raise "Unsupported field #{filter.attributes['field']}." if @type.field_mappings[filter.attributes['field']].nil?
              filter_object.field_joins = @type.field_joins
              @filters << filter_object
          else
              raise "Unsupported filter '#{filter.name}'."
          end
        end
      end
  end
end
