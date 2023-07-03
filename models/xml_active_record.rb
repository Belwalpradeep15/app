# FILENAME:     xml_active_record.rb
# AUTHOR:       Steven Klassen
# CREATED ON:   2008-12-17
# 
# DESCRIPTION:  Active record extensions for the objects we wish to be able to find
#  via our XML searches.
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


# XML based active records. More specifically this class provides the find_for_target
# public method and a number of protected methods. In addition to these methods subclasses
# must provide the following public and protected methods in order to function properly:
#   public
#   def render_xml(x) Will render an XML version of the object using the xml builder x.
#   def new_from_xml(xml, identXml) Should construct a new instance of the object based 
#          on the elements xml (the object's element) and indentXml (the Identification
#          element. The new object will be returned. This method is only needed if
#          the object is to be supported by the submit_controller.
#
#   protected
#   def self.field_mapping Must return a map from field names to field definitions. The
#           field definition is in turn an object containing :field representing the
#           name of the field in the SQL and optionally :quoted which should be set to
#           true if the values for this field must be quoted in the SQL. (Default to false.)
#           This method is only needed if the object is to be supported by the
#           search_controller.
class XMLActiveRecord < FotechActiveRecord

    self.abstract_class = true
    
    
    # Search for objects given an XML search description. The XML is in the form of a
    # DOM Target element as described in the
    # http://www.fotechsolutions.com/schemas/repository-0.1.xsd
    # schema. The specifics of what options and filters will be available for the search
    # will differ between the various objects and will be documented appropriate in
    # the various subclasses.
    def self.find_for_target(target)
    
        filters = target.elements.to_a('Filters/Filter')
        raise RuntimeError, "The target id='" + target.attributes['id'] + "' does not contain any filters." if filters.empty?
        
        args = {}
        args[:conditions] = conditions_from_filters(filters)
        args[:joins] = joins_from_filters(filters)
        opts = options_from_target(target)
        args[:order] = opts[:order]
        args[:limit] = opts[:limit]
        do_find(args, opts)
    end
    
    
    protected
    
    # Return a string representing the conditions found in the filters.
    def self.conditions_from_filters(filters)
        conditions = []
        values = []
        filters.each { |filter|
            conditions << FotechXML::condition_from_filter(filter, field_mapping, values)
        }
        [conditions.join(" AND ")] + values.flatten
    end
    
    # Return a string representing the joins required by the filters. By default this
    # simply returns nil. If a subclass needs to specify joins it must override
    # this method.
    def self.joins_from_filters(filters)
        nil
    end
  
    # Return a hash representing the options specified by the target. By default this
    # supports the following options:
    #   Options/Order - If specified :order will be added to the options object. This
    #       will be used by the default find_for_target method to set the :order argument
    #       to the find method. This element takes two attributes, 'field' which is required
    #       and specifies the field to be sorted on and 'descending' which if specified
    #       and set to true make the sort order descending. If more than one Order
    #       element is specified they will be applied in order with the first being
    #       the most significant column in the sort.
    #   Options/Limit - If specified :limit will be added to the options object. This
    #       will be used by the default find_for_target method to set the :limit argument
    #       to the find method. The element takes a single required attribute, 'rows',
    #       which specifies the maximum number of rows to return.
    # Subclasses will need to override this, and most likely do_find, in order to
    # support additional options. But they should call super if they intend to
    # also support this set.
    def self.options_from_target(target)
        opts = {}
        els = target.elements.to_a('Options/Order')
        opts[:order] = order_from_options(els) if !els.empty?
        
        els = target.elements.to_a('Options/Limit')
        opts[:limit] = els[0].attributes['rows'].to_i if !els.empty?
        
        opts
    end
    
    # Perform the find given the options. By default this ignores the options and
    # calls find passing in :all and the args hash. Subclasses should override this
    # method if they need to support custom options or more complex finds.
    def self.do_find(args, opts)
        find(:all, args)
    end
    
    
    private
    
    # Determine the sort order.
    def self.order_from_options(orderEls)
        fieldMap = field_mapping
        orderBy = []
        orderEls.each { |order|
            fieldName = order.attributes['field']
            raise RuntimeError, "Missing required attribute 'field'." if fieldName.nil?
            
            field = fieldMap[fieldName]
            raise RuntimeError, "Unsupported field name='" + fieldName + "'." if field.nil?
            
            desc = order.attributes['descending']
            if desc
                orderBy << field[:field] + " DESC"
            else
                orderBy << field[:field]
            end
        }
        orderBy.join(", ")
    end
end
