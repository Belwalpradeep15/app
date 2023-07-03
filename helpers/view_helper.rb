# FILENAME:     ViewHelper.rb
# AUTHOR:       Steven Klassen
# CREATED ON:   2008-11-17
#
# DESCRIPTION:  View helpers provided by the common-gui plugin.
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



# This module provides methods that will be added to views when this plugin is included.
module ViewHelper

    # Create a number of style and script links needed to setup fotech gui components.
    # To use this you pass in an array of component descriptors (described below)
    # which the Ruby code will use to determine what stylesheets and javascript tags
    # will need to be included and in what order. The component descriptors you
    # can use are as follows:
    #   :canvas - extensions needed to use text in canvas controls
    #   :colourchooser - allows a colour selection popup to be associated with an input
    #     simply by giving the input the class 'color'. See http://jscolor.com/ for more
    #     details on what we can do with this control.
    #   :dialog - allows use of the YUI Dialog component
    #   :editable - allows in-line editing by given an element an 'editable' class. You will
    #     need to call fotech.gui.initEditableFields() once the fields are available in the
    #     HTML in order to enable the editing.
    #   :layout - allows use of the YUI Layout Manager component
    #   :menu - allows use of the YUI Menu component
    #   :slider - allows use of the YUI Slider component.
    #   :statusbar - allows use of the fotech_statusbar_tag described below.
    #   :tab - allows use of the YUI TabView component.
    #   :calendar - allows use of the calendar control.
    #   :window - allows use of the items in the windows.js javascript.
    #
    # In addition you can include the option :cache => ...cache name... in which case
    # all the included javascripts and stylesheets will be combined into a single cached
    # one with the specified name.
    def fotech_gui_setup_tag(components, opts = {})
        # Iterate over the components and create a set of components, including any dependancies
        # that need to be installed.
        cacheName = nil
        cacheName = opts[:cache] if opts.has_key? :cache

        haveLayout = false
        componentsToInstall = {}
        components.each { |component|
            componentsToInstall[component] = true
            if component == :layout
                componentsToInstall[:yahoo] = true
                componentsToInstall[:dragdrop] = true
                componentsToInstall[:element] = true
                componentsToInstall[:animation] = true
                componentsToInstall[:resize] = true
            elsif component == :menu
                componentsToInstall[:yahoo] = true
                componentsToInstall[:container] = true
                componentsToInstall[:connection] = true
            elsif component == :dialog
                componentsToInstall[:yahoo] = true
                componentsToInstall[:container] = true
                componentsToInstall[:animation] = true
                componentsToInstall[:connection] = true
                componentsToInstall[:dragdrop] = true
            elsif component == :editable
                componentsToInstall[:yahoo] = true
            elsif component == :tab
                componentsToInstall[:yahoo] = true
                componentsToInstall[:element] = true
            elsif component == :slider
                componentsToInstall[:yahoo] = true
                componentsToInstall[:dragdrop] = true
            elsif component == :button
                componentsToInstall[:yahoo] = true
                componentsToInstall[:animation] = true
                componentsToInstall[:element] = true
            elsif component == :calendar
                componentsToInstall[:yahoo] = true
            elsif component == :canvas
                componentsToInstall[:yahoo] = true
                componentsToInstall[:control] = true
            end
        }

        # Iterate over the components and remove any that have already been loaded.
        components.each { |component|
            if component == :have_layout
                componentsToInstall.delete :layout
                componentsToInstall.delete :yahoo
                componentsToInstall.delete :dragdrop
                componentsToInstall.delete :element
                componentsToInstall.delete :animation
                componentsToInstall.delete :resize
                haveLayout = true
            end
        }

        # Install the required stylesheets and javascripts.
        str = ''
        str.concat stylesheet_link_tag('fotech/common_gui/yahoo/build/fonts/fonts-min.css', :media => "all") + "\n" \
            if componentsToInstall.has_key? :yahoo
        str.concat stylesheet_link_tag('fotech/common_gui/yahoo/build/container/assets/skins/sam/container.css', :media => "all") + "\n" \
            if componentsToInstall.has_key? :container
        str.concat stylesheet_link_tag('fotech/common_gui/yahoo/build/assets/skins/sam/resize.css', :media => "all") + "\n" \
            if componentsToInstall.has_key? :resize
        str.concat stylesheet_link_tag('fotech/common_gui/yahoo/build/assets/skins/sam/layout.css', :media => "all") + "\n" \
            if componentsToInstall.has_key? :layout
        str.concat stylesheet_link_tag('fotech/common_gui/yahoo/build/menu/assets/skins/sam/menu.css', :media => "all") + "\n" \
            if componentsToInstall.has_key? :menu
        str.concat stylesheet_link_tag('fotech/common_gui/yahoo/build/tabview/assets/skins/sam/tabview.css', :media => "all") + "\n" \
            if componentsToInstall.has_key? :tab
        str.concat stylesheet_link_tag('fotech/common_gui/yahoo/build/slider/assets/skins/sam/slider.css', :media => "all") + "\n" \
            if componentsToInstall.has_key? :slider
        str.concat stylesheet_link_tag('fotech/common_gui/yahoo/build/button/assets/skins/sam/button.css', :media => "all") + "\n" \
            if componentsToInstall.has_key? :button
        str.concat stylesheet_link_tag('fotech/common_gui/jscalendar/calendar-system.css', :media => "all") + "\n" \
            if componentsToInstall.has_key? :calendar
        str.concat stylesheet_link_tag('fotech/common_gui/common.css', :media => "all") + "\n" if !haveLayout
        str.concat stylesheet_link_tag('fotech/common_gui/common-print.css', :media => 'print') + "\n" if !haveLayout

        if componentsToInstall.has_key? :statusbar
            str.concat <<HERE

<style type="text/css" media="all">
    div#statusbar {
        padding-left: 2px;
        padding-right: 2px;
        padding-top: 0px;
        padding-bottom: 0px;
        vertical-align: middle;
    }
</style>
HERE
        end
        if componentsToInstall.has_key? :menu
            str.concat <<HERE

<style type="text/css">
    div#menubar {
        position: absolute;
        top: 1px;
        left: 5px;
        opacity: .90;
    }

    em#fotechmenu {
        text-indent: -6em;
        display: block;
		background-image:url("#{image_path 'fotech/common_gui/logo-small.svg'}");
        background-position: center center;
        background-repeat: no-repeat;
        width: 20px;
        overflow: hidden;
    }

    #menubar {
        z-index: 9999;
    }
</style>
HERE
        end
        if componentsToInstall.has_key? :button
            str.concat "<style type='text/css' media='all'>\n"
            str.concat "  .glossy { background: url('" + image_path('fotech/common_gui/gloss.png') + "') repeat-x left center; }\n"
            str.concat "  .ie6-glossy {\n"
            str.concat "    background-image: none;\n"
            str.concat "    filter: progid:DXImageTransform.Microsoft.AlphaImageLoader(src='" + image_path('fotech/common_gui/gloss.png') + "', sizingMethod = 'scale');\n"
            str.concat "  }\n"
            str.concat "</style>\n"
        end

        jscripts = []
        jscripts << 'fotech/common_gui/yahoo/build/yahoo-dom-event/yahoo-dom-event.js' if componentsToInstall.has_key? :yahoo
        jscripts << 'fotech/common_gui/yahoo/build/connection/connection-min.js' if componentsToInstall.has_key? :connection
        jscripts << 'fotech/common_gui/yahoo/build/dragdrop/dragdrop-min.js' if componentsToInstall.has_key? :dragdrop
        jscripts << 'fotech/common_gui/yahoo/build/element/element-min.js' if componentsToInstall.has_key? :element
        jscripts << 'fotech/common_gui/yahoo/build/animation/animation-min.js' if componentsToInstall.has_key? :animation
        jscripts << 'fotech/common_gui/yahoo/build/resize/resize-min.js' if componentsToInstall.has_key? :resize
        jscripts << 'fotech/common_gui/yahoo/build/layout/layout-min.js' if componentsToInstall.has_key? :layout
        jscripts << 'fotech/common_gui/yahoo/build/container/container-min.js' if componentsToInstall.has_key? :container
        jscripts << 'fotech/common_gui/yahoo/build/menu/menu-min.js' if componentsToInstall.has_key? :menu
        jscripts << 'fotech/common_gui/yahoo/build/tabview/tabview-min.js' if componentsToInstall.has_key? :tab
        jscripts << 'fotech/common_gui/yahoo/build/slider/slider-min.js' if componentsToInstall.has_key? :slider
        jscripts << 'fotech/common_gui/yahoo/build/button/button-min.js' if componentsToInstall.has_key? :button
        jscripts << 'fotech/common_gui/dialog.js' if componentsToInstall.has_key? :dialog
        jscripts << 'fotech/common_gui/menu.js' if componentsToInstall.has_key? :menu
        jscripts << 'fotech/common_gui/editable.js' if componentsToInstall.has_key? :editable
        jscripts << 'fotech/common_gui/button.js' if componentsToInstall.has_key? :button
        jscripts << 'fotech/common_gui/common_labels.js'
        if componentsToInstall.has_key? :calendar
            jscripts << 'fotech/common_gui/jscalendar/calendar.js'

            if (session[:current_user_locale])
              jscripts << "fotech/common_gui/jscalendar/lang/calendar-#{session[:current_user_locale]}.js"
            else
              jscripts << 'fotech/common_gui/jscalendar/lang/calendar-en.js'
            end

            jscripts << 'fotech/common_gui/jscalendar/calendar-setup.js'
            jscripts << 'fotech/common_gui/calendar_setup.js'
        end
        jscripts << 'fotech/common_gui/windows.js' if componentsToInstall.has_key? :window
        jscripts << 'fotech/common_gui/control.js' if componentsToInstall.has_key? :control
        if componentsToInstall.has_key? :canvas
            jscripts << 'fotech/common_gui/strokeText.js'
            jscripts << 'fotech/common_gui/overlay.js'
            jscripts << 'fotech/common_gui/canvas.js'
        end
        jscripts << 'fotech/common_gui/ruler.js' if componentsToInstall.has_key? :ruler
        jscripts << 'fotech/common_gui/jscolor/jscolor.js' if componentsToInstall.has_key? :colourchooser
        if !jscripts.empty?
            jscripts << { :cache => cacheName } if cacheName
            str.concat javascript_include_tag(*jscripts)
        end

        return str.html_safe
    end


    # Create a standard Fotech banner.
    def fotech_banner_tag
        "
        <div id='banner' style='height: 40px; min-height: 45px'>
          <div id='view_status' style='position: absolute; top: 35px; left: 10px;' class='noprint'>
          </div>
          <div id='welcome' style='position: absolute; top: 10px; right: 135px;' class='noprint'>
            #{ welcome_message }
          </div>
          <div id='logo' style='position: absolute; top: 5px; right: 0px;'>
            <img src='/images/fotech/common_gui/fotech_branding.png' align='right' style='height: 45px; margin-right: 5px;'/>
          </div>
        </div>
        ".html_safe
    end


    # Create a standard Fotech status bar. This will include a status area that may be
    # obtained using the id 'status'.
    def fotech_statusbar_tag(app_name = nil)
        warningTag = ""
        version = ""
        if APP_CONFIG and APP_CONFIG['monitor'] and APP_CONFIG['monitor']['version']
            if APP_CONFIG['monitor']['version'].index('beta')
                warningTag = "<span class='hilite'>!!! BETA !!!</span>"
            elsif APP_CONFIG['monitor']['version'].index('alpha')
                warningTag = "<span class='hilite pulse'>!!! ALPHA !!!</span>"
            end
            version = APP_CONFIG['monitor']['version']
        end

        "<script type='text/javascript'>
            fotech.gui.preload(['/images/fotech/common_gui/broken_heart.png',
                                '/images/fotech/common_gui/heart.png',
                                '/images/fotech/common_gui/heartbeat.gif']);
         </script>
         <div id='statusbar'>
              <table style='width: 100%;'>
                  <tr>
                      <td nowrap='nowrap' class='copyright' align='left'>
                        #{warningTag}
                        #{I18n.t('common.copyright', :year => Time.now.year)}
                        <span class='small_hint'>#{ version }</span>
                      </td>
                      <td nowrap='nowrap' width='100%' align='right'><span id='status' class='hilite'></span></td>
                      <td nowrap='nowrap' class='nospace'><span id='heartbeat'><img src='' style='vertical-align: bottom; width: 18px; height: 18px;display:none;' /></span></td>
                  </tr>
              </table>
          </div> ".html_safe
    end


    # Slider control tag. In browsers that support the HTML5 range type we use it, in other
    # browsers we use  YUI Slider object. In any case we also create a text showing the
    # current value.
    #
    # To work property your page must have included the fotech_setup_tag [:slider].
    def fotech_slider_field_tag(name, value, minValue, maxValue, minDisplayValue = nil, maxDisplayValue = nil, displayStep = 1, width = 200.0)
		  fotech_slider_field(nil, name, value, minValue, maxValue, minDisplayValue, maxDisplayValue, displayStep, width).html_safe
	  end

	def fotech_slider_field(object, method, value, minValue, maxValue, minDisplayValue = nil, maxDisplayValue = nil, displayStep = 1, width = 200.0)
		if object.nil?
			tag_name = method.to_s
			tag_id = method.to_s
		else
			tag_name = "#{object.to_s}[#{method.to_s}]"
			tag_id = "#{object.to_s}_#{method.to_s}"
		end
        clean_tag_id = tag_id.gsub /:/, '_'

        minDisplayValue = minValue if minDisplayValue.nil?
        maxDisplayValue = maxValue if maxDisplayValue.nil?
        displayScale = (maxDisplayValue - minDisplayValue) / (maxValue - minValue)
		valueScale = 1 / (displayStep/displayScale)

#		valueScale = 1.0 if (valueScale * 10) < 10
#        valueScale = 10.0 if (valueScale * 10.0) < 10
#        valueScale = 100.0 if (valueScale * 10.0) < 10
#        valueScale = 1000.0 if (valueScale * 100.0) < 10
#        valueScale = 10000.0 if (valueScale * 1000.0) < 10

        str = <<-TAG
		<table>
			<tr>
				<td>
					<input id='#{tag_id}_slider' tag_id='#{tag_id}_slider' type='range' class='fotech_slider'
                        min='#{minValue * valueScale}' max='#{maxValue * valueScale}'
                        value='#{value * valueScale}' step='#{displayStep}' style='width:#{width}px'/>
				</td>
				<td>
					<span id='#{tag_id}_value' style='width:30px;'>#{value * displayScale}</span>
					<input id='#{tag_id}' name='#{tag_name}' type='text' value='#{value}' style='display:none;width:40px' />
				</td>
			</tr>
        </table>

        <script type='text/javascript'>
            var #{clean_tag_id}_sldr = null;
            var #{clean_tag_id}_cb = function() {
				var valueScale = (#{clean_tag_id}_sldr == null ? #{valueScale} : #{width / (maxValue - minValue)});
                var valueShift = (#{clean_tag_id}_sldr == null ? 0.0 : #{minValue});
                var displayShift = (#{clean_tag_id}_sldr == null ? 0.0 : #{minDisplayValue});
                var value = (#{clean_tag_id}_sldr == null ? parseFloat($('#{tag_id}_slider').value) : #{clean_tag_id}_sldr.getValue()) / valueScale;
                $('#{tag_id}_value').innerHTML = String(fotech.util.round10((value * #{displayScale}) + displayShift, -2));
                $('#{tag_id}').value = value + valueShift;
				// if we are working with a slider then we need to trigger a change event
				if(#{clean_tag_id}_sldr != null){
					$('#{tag_id}').fire('control:changed');
				}
            }
            var #{clean_tag_id}_init = function() {
                var slider = $('#{tag_id}_slider');
                if (slider.type == "text") {
                    var valueScale = #{width};
                    var divbg = new Element("div", { id: '#{tag_id}_bg', 'class': 'slider_bg', tabindex: '-2' }).setStyle({width:'#{width + 28}px'});
                    var divbgimage = new Element("span", { id: '#{tag_id}_bg_image', tabindex: '-1' }).setStyle({width:'#{width}px'});
                    var divthumb = new Element("div", { id: '#{tag_id}_thumb', 'class': 'yui-slider-thumb' });
                    var img = new Element("img", { alt: 'Thumb', src: 'fotech/common_gui/yahoo/build/slider/assets/thumb-n.gif' });
                    divthumb.appendChild(img);
                    divbg.appendChild(divbgimage);
                    divbg.appendChild(divthumb);
                    slider.replace(divbg);

                    #{clean_tag_id}_sldr = YAHOO.widget.Slider.getHorizSlider('#{tag_id}_bg', '#{tag_id}_thumb', 0, valueScale);
                    #{clean_tag_id}_sldr.setValue(#{(value.to_f - minValue.to_f) / (maxValue.to_f - minValue.to_f)} * valueScale);
                    #{clean_tag_id}_sldr.subscribe('change', #{clean_tag_id}_cb);
                    #{clean_tag_id}_sldr.subscribe('ready', #{clean_tag_id}_cb);
                }
                else {
                    slider.observe('change', #{clean_tag_id}_cb);
                }
            }
            #{clean_tag_id}_init();
        </script>
        TAG
        str.html_safe
    end

    # Build a select control from a list of XML elements.
    def fotech_select(object, method, elements, value_xpath, text_xpath)
        str = '<select id="' + object.to_s + '_' + method.to_s + '"'
        str << ' name="' + object.to_s + '[' + method.to_s + ']">'
        if !elements.nil?
            elements.each { |el|
                value = REXML::XPath.first(el, value_xpath).to_s
                name = REXML::XPath.first(el, text_xpath).to_s
                str << '<option value="' + value + '">' + name + '</option>'
            }
        end
        str << '</select>'
        return str.html_safe
    end

    # Build an illuminated button. The name should be the base name for the control and
    # the color must be specified either in hex or rgb. This will create a javascript
    # variable ${name}_button containing the fotech.gui.IlluminatedButton object,
    # a div with the id ${name}_container, a span with the id ${name}-button and a
    # button with the id ${name}-button-button. Note that these ids are what is built
    # by the YUI code and would not be easy for us to change. But you will need them
    # if you want to customize and control the button that is created.
    def fotech_illuminated_button(name, label, color)
        str = <<HERE

<div id="!NAME!_container"></div>
<script type="text/javascript">
    var !NAME!_button = new fotech.gui.IlluminatedButton({
        id: "!NAME!-button",
        label: "!LABEL!",
        container: "!NAME!_container",
        buttonColor: "!COLOR!" });
</script>
HERE

        str.gsub!(/!NAME!/, name)
        str.gsub!(/!LABEL!/, label)
        str.gsub!(/!COLOR!/, color)
        return str.html_safe
    end

    # Build a calendar form control. This will create a text input field with the
    # specified name and an id of #{name}Id and an image with the id #{name}Img
    # referencing the appropriate javascript. The title will be used as the title
    # of the popup window. If not specified, 'Select date/time' will be used.
    #
    # To work properly your page must have included the fotech_setup_tag [:calendar].
    # options for
    def fotech_calendar(name, title, value=nil, options={})
        title = 'Select date/time' if title.nil?
        inputFieldId = options[:inputField] || "#{name}Id"
        inputFieldName = options[:inputFieldName] || name
        str = <<-string
            <input type='text' name='#{inputFieldName}' id='#{inputFieldId}' size='12' value='#{value}'/>
                #{image_tag 'fotech/common_gui/jscalendar/img.gif',
                        :id => name + 'Img',
                        :style => 'cursor: pointer;',
                        :title => title,
                        :onmouseover => "this.style.background='red';",
                        :onmouseout => "this.style.background='';"}
            <script type='text/javascript'>
                _fotechSetupCalendar('#{name}',#{options.to_json});
            </script>
        string
        return str.html_safe
    end

    # Build a color form control. This will create a text input field with given name and
    # and id of the same name. The input field will use the jscolor javascript code to enable
    # a color picker. In addition to the 'change' event which will fire every time the color
    # control is changed you can also observe the 'color:set' event which will fire when the
    # color picker has been dismissed, signalling that the user is done setting the color.
    # Note that to use this you must have specified the :colourchooser option with the
    # fotech_gui_setup_tag.
    #
    # The value parameter should be the initial color in the 6 character rgb hex form,
    # including the "#" symbol (eg. #000000 is black and #ff0000 is bright red).
    def fotech_colour(name, value)
        str = <<-TAG
        <input id="#{name}" name="#{name}" class="color {hash:true}" value="#{value}" />
        TAG
        str.html_safe
    end

  private

    # Determine the full user name based on the currently logged in user.
    def welcome_message
        return nil \
            if (not request.headers["REMOTE_USER"]) or (not session[:current_user]) or @suppressUser
        return I18n.t('main.banner.welcome', :name => session[:current_user].fullname) \
            if session[:current_user]
        return I18n.t('main.banner.welcome', :name => request.headers['REMOTE_USER'])
    end

end

