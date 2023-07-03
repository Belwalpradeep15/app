module Admin::ConfigurationHelper

    def configuration_text_field(object_name, method, options = {}, more_options = {})
        more_options[:units] ||= ''
        more_options[:smallHint] ||= ''
        
        str = text_field object_name, method, options
        str << more_options[:units]
        str << "<br /><span class='smallHint'>#{more_options[:smallHint]}</span>" unless (more_options[:smallHint] ||= "").blank?     
    end

end
