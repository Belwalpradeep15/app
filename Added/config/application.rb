require_relative 'boot'

require "rails"
# Pick the frameworks you want:
require "active_model/railtie"
require "active_job/railtie"
require "active_record/railtie"
require "active_storage/engine"
require "action_controller/railtie"
require "action_mailer/railtie"
require "action_view/railtie"
require "action_cable/engine"
# require "sprockets/railtie"
require "rails/test_unit/railtie"

# Require the gems listed in Gemfile, including any gems
# you've limited to :test, :development, or :production.
Bundler.require(*Rails.groups)

CUSTOM_PREFERENCES = {}

module Web
  class Application < Rails::Application
  	
    # Initialize configuration defaults for originally generated Rails version.
    config.load_defaults 5.2

    # Settings in config/environments/* take precedence over those specified here.
    # Application configuration can go into files in config/initializers
    # -- all .rb files in that directory are automatically loaded after loading
    # the framework and any gems in your application.


    # Fotech

    config.active_record.schema_format = :sql
    config.active_job.queue_adapter = :delayed_job
    config.middleware.use I18n::JS::Middleware

    # Add our custom types.
    config.after_initialize do
      require 'postgresql_gis_adapter'
      require 'custom_postgres_extensions'
      require 'FotechDB'
      require 'FotechXML'
      require 'gmap_polyline_encoder'
      require 'wav_writer'
      require 'smtp_tls'
      require 'custom_handlers/event_handler_meta'

      # Read in the xml key/value parameters and return them.
      def read_xml_parameters(root, xpath)
        params = {}
        REXML::XPath.each(root, xpath) { |param|
          params[param.attributes['key']] = param.text
          RAILS_DEFAULT_LOGGER.debug "    parameter #{param.attributes['key']}=#{param.text}"
        }
        return params
      end

      # Perform any requires lines.
      def perform_requires(root, xpath)
        REXML::XPath.each(root, xpath) { |req|
          code = "require '#{req.text}'"
          RAILS_DEFAULT_LOGGER.debug "    #{code}"
          eval(code)
        }
      end

      # Init any custom classifiers if they exist. If the file doesn't exist we rescue the error
      # and simply note that no classifiers exist.
      begin
        classifiers = []
        is = File.open("config/classifiers.xml")
        doc = REXML::Document.new(is)
        REXML::XPath.each(doc, "//classifier") { |classifier|
          params = read_xml_parameters(classifier, "parameter")
          filters = []
          REXML::XPath.each(classifier, "filters/*") { |filter|
            if filter.name == 'fibreLineIds'
              filters << { :field => 'fibreLineId', :values => Set.new(filter.text.split(',')) { |o| Integer(o) } }
            elsif filter.name == 'eventTypes'
              filters << { :field => 'eventType', :values => Set.new(filter.text.split(',')) }
            else
              raise "Unsupported filter type #{ filter.name }."
            end
          }
          description = nil
          el = REXML::XPath.first(classifier, "description")
          description = el.text if el

          classifiers << { :name => classifier.attributes['name'],
                           :type => classifier.attributes['type'],
                           :description => description,
                           :params => params,
                           :filters => filters }
        }
      rescue Errno::ENOENT => ex
        classifiers = nil
      ensure
        is.close if is
      end
      CLASSIFIERS = classifiers

      # grab the custom preferences
      begin
        RAILS_DEFAULT_LOGGER.debug "reading custom organization preferences"

        preferences = {}
        is = nil
        is = File.open("config/custom-preferences.xml")
        doc = REXML::Document.new(is)

        REXML::XPath.each(doc, "//organization") do |org|
          org_id = org.attributes['id']
          RAILS_DEFAULT_LOGGER.debug "Setting for organization(s): org_id=#{org_id}"
          if org_id.nil?
            preference_org_list = [nil]
          else
            preference_org_list = org_id.split(',').collect{|id| id.to_i}
          end

          REXML::XPath.each(org, 'preference') do |pref_node|
            preference_org_list.each do |org_id|
              preferences[org_id] ||= {}
              preferences[org_id][pref_node.attributes['key']] = pref_node.text
              RAILS_DEFAULT_LOGGER.debug "preference set: org_id=#{org_id} key=#{pref_node.attributes['key']} value=#{pref_node.text}"
            end
          end
        end
      rescue Errno::ENOENT => ex
        RAILS_DEFAULT_LOGGER.debug "No custom organization preferences have been defined."
        preferences = {}
      rescue Exception => ex
        RAILS_DEFAULT_LOGGER.debug ex.message
        preferences = {}
      ensure
        is.close if is
      end
      CUSTOM_PREFERENCES = preferences

      undef read_xml_parameters
      undef perform_requires
    end

  end
end
