# FILENAME:     FotechXML.rb
# AUTHOR:       Steven Klassen
# CREATED ON:   2008-10-20
# 
# DESCRIPTION:  Fotech XML module.
#
# LAST CHANGE:
# $Author$
#   $Date$
#    $Rev$
#    $URL$
#
# COPYRIGHT:
# This file is Copyright (c) 2008 by Fotech Solutions. All rights
# reserved.

require 'rexml/xpath'


# This module provides classes and utilities related to XML creation and parsing.
module FotechXML

    # Obtain the first element in the document doc that matches the given xpath. If namespaces
    # are referenced they should be specified in the namespace map ns. If no matching element
    # is found an exception will be raised.
    def self.xpath(doc, xpath, ns = {})
        el = REXML::XPath.first(doc, xpath, ns)
        raise RuntimeError, "Could not find an element matching " + xpath + "." if el == nil
        return el
    end
    
    # Return the text of an element. This will return all the text elements, concatenated
    # together. If there is no text then nil is returned.
    def self.all_text(el)
        return nil if !el.has_text?
        return el.texts.join(" ")
    end
    
    # Convert a Float-1D element into an array of floating point values.
    def self.float_1d(el)
        noValues = el.attributes['no-values'].to_i
        ar = []
        all_text(el).split(',').each { |val| ar << val.to_f }
        raise ParseError, "The number of values in Float-1D must match the 'no-values' attribute." \
            if noValues != ar.size
        return ar
    end
    
    # Convert an array of floating point values into a Float-1D element using the given xml writer.
    def self.write_as_float_1d(xml, ar)
        xml.tag! "Float-1D", ar.join(','), "no-values" => ar.size
    end
    
    # Format a ruby date/time in a manner suitable for XML output. Specifically this will
    # write it out in the XMLSchema dateTime format.
    def self.formatTime(date)
        date.getutc.strftime("%Y-%m-%dT%H:%M:%SZ")
    end
    
    def self.filters(xml, fields = {:only => []})
      ns = { 'r' => 'http://www.fotechsolutions.com/schemas/repository-0.1.xsd' }   
      doc = REXML::Document.new(xml)
      filters = []
      REXML::XPath.each(doc, '//r:Filters/r:Filter', ns) do |el| 
        filters << nodeToFilter(el) if (fields[:only].empty? || fields[:only].include?(el.attributes["field"]))
      end
      filters
    end
    
    # Return a condition given a Filter XML element. The values array will have any values
    # which need to be handled as bound variables appended to it.
    def self.condition_from_filter(el, fieldMapping, values)
        mapping = fieldMapping[el.attributes['field']]
        raise RuntimeError, "Unsupported field='" + el.attributes['field'] + "'." if mapping.nil?
        field = mapping[:field]
        quoted = mapping[:quoted]
        isTime = mapping[:isTime]
        op = OPERATOR_MAPPING[el.attributes['operation']]
        raise RuntimeError, "Unsupported operation='" + el.attributes['operation'] + "'." if op.nil?
        return "#{field} #{op} (#{safe_text(el.text, quoted, isTime, values)})"
    end
    
    # Mapping of the supported operators from XML to SQL.
    # Return the text string reformated safely for inclusion in SQL.
    def self.safe_text(txt, quoted, isTime, values)
        if isTime
           # t = Time.xmlschema(txt)
           #  txt = formatTime(t)
        end
        
        if quoted == true 
            values << txt.split(',')
            return txt.split(',').collect { |item| '?' }.join(',')
        else
            return txt
        end
    end
    
    # Supported XML to SQL operators.
    OPERATOR_MAPPING = { 
      "EQUALS"=>"=", 
      "IN"=>"IN", 
      "GREATER_THAN"=>">",
      "GREATER_THAN_OR_EQUALS"=>">=", 
      "LESS_THAN_OR_EQUALS"=>"<=" 
    }
      
    private 
    
      def self.nodeToFilter(el)
        return [el.attributes["field"], el.attributes["operation"], el.text]
      end

end
