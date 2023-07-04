# Read in one of the deployment-specific configuration.
global_app_config_files = %w(
    config/application_config.yml
    /opt/Fotech/panoptes/web/current/panoptes-rails/config/application_config.yml
)

global_app_config_files.each do |f|
    if File.exists? f
        APP_CONFIG = YAML.load_file(f)
        ::Rails.logger.info "Loaded global_app_config_file #{f}"
        break
    end
end

APP_CONFIG ||= {}

# Merge any application-specific configurations
merger = proc do |key, v1, v2|
    if key == 'map_layers'
        v2
    elsif v1.kind_of?(Hash) && v2.kind_of?(Hash)
        v1.merge(v2, &merger)
    else
        v2
    end
end

custom_app_config_file = "/opt/Fotech/panoptes/etc/custom_application_config.yml"

if File.exists? custom_app_config_file
    APP_CONFIG.merge!(YAML.load_file(custom_app_config_file), &merger)
    ::Rails.logger.info "Merged custom_app_config_file #{custom_app_config_file}"
end


# Whitelist locales avialable for the application
I18n.available_locales = [:en, :es, :it, :tr]
