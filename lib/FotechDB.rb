# FILENAME:     FotechDB.rb
# AUTHOR:       Steven Klassen
# CREATED ON:   2008-09-23
# 
# DESCRIPTION:  Fotech database module.
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

require 'rexml/document'
require 'rexml/xpath'
require 'pg'


# This module provides classes and utilities related to database access. It is our hope
# that any DBMS-specific features can be handled by this module.
module FotechDB

    # Convert a time object into our standard format. Presently this assumes that the time
    # is in zulu.
    def self.formatTime(time)
        return "#{time.strftime('%Y-%m-%dT%H:%M:%S')}.#{time.usec}Z"
    end
    
    
    # Base class for querying the database. This can be used "as-is" via the query
    # method or, more commonly, can be subclassed to provide getter methods to perform
    # queries on a given type of data. At present this is specific to Postgres.
    class Query

        # Setup the query to use a given database, user, and password. If the dbname
        # is set to nil (which is the default for all three arguments) then current
        # connection of the active record will be used. Most likely that will only
        # work if you are in a Rails database. The user parameter is an object
        # describing the currently logged in user. It is used to enforce permissions
        # at the lowest possible level.
        def initialize(user, dbname = nil, dbuser = nil, password = nil)
            if dbname == nil
                @useActive = true
                @user = user
            else
                @useActive = false
                @user = user
                @dbname = dbname
                @dbuser = dbuser
                @dbpassword = password
                @connection = nil
            end
        end
        
        # Close the query and its connections. You should call this in an ensure block
        # in order to avoid leaking connections. If the object was constructed to use
        # the active record, then this will not do anything. 
        def close()
            if @connection != nil
                @connection.close
                @connection = nil
            end
        end
        
        # Run a query and return a result object. The result object can be treated as an
        # array of dictionaries where the keys in the dictionaries are the column labels
        # returned by the query. In addition the returned object will have a "clear" method
        # that should be called in an ensure block. If the sql includes items of the form $1
        # $2, etc., then the additional arguments should be passed to the query method.
        def query(sql, *params)
            conn = connection()
            paramStr = ""
            if !params.empty?
                paramStr = ", params=" + params.to_s
            end
            RAILS_DEFAULT_LOGGER.debug 'FotechDB::Query.query: SQL=' + sql + paramStr
            res = conn.exec(sql, *params)
            # TODO: need to add proper error handling and throw an exception
            return res
        end
        
        
        protected
        
        # Obtain the connection, creating it if necessary.
        def connection()
            if @useActive
                return ActiveRecord::Base.connection.instance_variable_get(:@connection)
            else
                if @connection == nil
                    @connection = PGconn.open(:dbname => @dbname, :user => @dbuser, :password => @dbpassword)
                end
                return @connection
            end
        end
    end


    # Construct SQL statements from XML descriptions. Note that at present this is a very
    # simple builder. It does not involve joins or other complex items.
    class SqlBuilder
        # Create a builder with a given field name mapping. The field name mapping should
        # map from a field name as specified in the XML to a column name in the table.
        def initialize(fieldNameMapping)
            @fieldNameMapping = fieldNameMapping
        end
        
        # Create a query clause from an XML description.
        def where(xml)
            filters = xmlToFilters(xml)
            raise ArgumentError, "Could not find any filters in the xml." if filters.empty?
            
            where = "WHERE " + filters[0]
            1.upto(filters.size-1) {|i| where << " AND " + filters[i]}
                
            return where
        end
        
        private
        
        OPERATOR_MAPPING = { "EQUALS"=>" = ", "IN"=>" IN ", "GREATER_THAN"=>" > ",
            "GREATER_THAN_OR_EQUALS"=>" >= ", "LESS_THAN_OR_EQUALS"=>" <= " }
        
        # Obtain an array of filters based on the XML.
        def xmlToFilters(xml)
            ns = { 'r' => 'http://www.fotechsolutions.com/schemas/repository-0.1.xsd' } 
            doc = REXML::Document.new(xml)
            filters = []
            REXML::XPath.each(doc, '//r:Filters/r:Filter', ns) { |el| filters << nodeToFilter(el) }
            return filters
        end
        
        # Convert a filter node to a filter.
        def nodeToFilter(el)
            field = el.attributes["field"]
            op = el.attributes["operation"]
            raise RuntimeError, "Could not find db field for " + field if !@fieldNameMapping.has_key? field
            raise RuntimeError, "The operation " + op + " is not yet supported." if !OPERATOR_MAPPING.has_key? op
            return @fieldNameMapping[field][:field] + OPERATOR_MAPPING[el.attributes["operation"]] + nodeToText(el, @fieldNameMapping[field][:quoted])
        end
        
        # Get the text value for a node, taking the operator into account.
        def nodeToText(el, quoted)
            op = el.attributes["operation"]
            if op == "IN"
                if quoted
                    return "('" + el.text.gsub(",", "','") + "')"
                else
                    return "(" + el.text + ")"
                end
            else
                if quoted
                    return "'" + el.text + "'"
                else
                    return el.text
                end
            end
        end
    end
end
