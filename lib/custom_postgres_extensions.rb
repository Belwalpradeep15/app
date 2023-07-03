# FILENAME:     ustom_postgres_extensions.rb
# AUTHOR:       Aaron Rustad <arustad@anassian.com>
# CREATED ON:   Sat  7 Mar 2009 11:15:20 MST
#
# DESCRIPTION:  Custom Postgres Extensions
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

module Fotech
  module CustomPostgresExtensions
    def self.included(base)
      base.extend(ClassMethods)
    end

    module ClassMethods
      # # Allows a model to define a given column as a precision array.
      # def as_double_precision_array(attribute_name)
      #   attribute_name = attribute_name.to_s
      #   attribute_instance_alias = "@#{attribute_name}_alias".to_sym
      #   method_name_getter = attribute_name
      #   method_name_setter = attribute_name + '='
      #
      #   convert_alias_to_orginal = "convert_alias_to_orig_for_#{attribute_name}".to_sym
      #   before_save convert_alias_to_orginal
      #
      #
      #   # Defines a method that will intercept calls to the attribute. Will set up
      #   # an instance variable to hold the array and does this only once.
      #   define_method(method_name_getter.to_sym) do
      #     unless instance_variable_defined? attribute_instance_alias
      #       array = self.class.str_to_float_array(read_attribute(attribute_name.to_sym))
      #       instance_variable_set(attribute_instance_alias, array)
      #     end
      #     instance_variable_get(attribute_instance_alias)
      #   end
      #
      #   # defines the setter method.
      #   define_method(method_name_setter.to_sym) do |value|
      #     instance_variable_set(attribute_instance_alias, value)
      #   end
      #
      #   # Before we save, we need to convert the array to a postgres-friendly version so we
      #   # can insert into the database.
      #   define_method(convert_alias_to_orginal) do
      #     write_attribute(attribute_name.to_sym, self.class.float_array_to_str(instance_variable_get(attribute_instance_alias)))
      #   end
      # end
      #
      # def str_to_float_array(string)
      #   return nil if (string.nil? || string.empty?)
      #   string[1..-2].split(',').map { |num| num.to_f }
      # end
      #
      # def float_array_to_str(array)
      #   (array.nil? || array.empty?) ? nil : '{' + array.join(',') + '}'
      # end
    end
  end

  module DefaultSelect
    def self.append_features(base)
      super
      base.extend ClassMethods
    end

    module ClassMethods
      # Defines a default select string to use when using the find methods. Useful
      # when you need to customize how data is retuned from the database.
      def select_with(select_string)
        self.class_eval %{
          class << self
            def find_with_select(*args)
              if args[1]
                args[1][:select] = "#{select_string}" if args[1].is_a?(Hash) && !args[1][:select]
              else
                args[1] = {:select => "#{select_string}"}
              end
              find_without_select(*args)
            end

            alias_method :find_without_select, :find
            alias_method :find, :find_with_select
          end
        }
      end
    end
  end
end

ActiveRecord::Base.class_eval do
  include Fotech::CustomPostgresExtensions
  include Fotech::DefaultSelect
end

module ActiveRecord::ConnectionAdapters::SchemaStatements
  # def add_foreign_key_by_name(from_table, from_column, to_table, constraint_name)
  #   execute %{ALTER TABLE #{from_table}
  #             ADD CONSTRAINT #{constraint_name}
  #             FOREIGN KEY (#{from_column})
  #             REFERENCES #{to_table}(id)}
  # end
  #
  # def add_foreign_key(from_table, from_column, to_table)
  #   constraint_name = "fk_#{from_table}_#{from_column}"
  #
  #   add_foreign_key_by_name(from_table, from_column, to_table, constraint_name)
  # end

  # def drop_foreign_key(from_table, from_column)
  #   constraint_name = "fk_#{from_table}_#{from_column}"
  #   drop_foreign_key_by_name(from_table, constraint_name)
  # end
  #
  # def drop_foreign_key_by_name(from_table, constraint_name)
  #   exists = execute %{SELECT count(*) FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS WHERE CONSTRAINT_NAME = '#{constraint_name}'
  #                AND TABLE_NAME='#{from_table}'}
  #
  #   if exists[0][0] == "1"
  #     execute %{ALTER TABLE #{from_table}
  #                 DROP CONSTRAINT "#{constraint_name}"}
  #   end
  # end

end

module ActiveRecord::ConnectionAdapters
  class TableDefinition
    def timestamps_with_custom_options(*args)
      options = args.extract_options!
      options.default = {}
      column(:created_at, :datetime, options[:created_at])
      column(:updated_at, :datetime, options[:updated_at])
    end

    alias_method :default_timestamps, :timestamps
    alias_method :timestamps, :timestamps_with_custom_options
  end
end
