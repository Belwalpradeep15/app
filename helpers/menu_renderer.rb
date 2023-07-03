# FILENAME:     menu_renderer.rb
# AUTHOR:       Steven Klassen
# CREATED ON:   2008-11-18
#
# DESCRIPTION:
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


# This module provides a method that will render a menu description array as
# the appropriate javascript.
module MenuRenderer
    # Render a menu description array as JavaScript which will be returned to the
    # browser to be executed. This requires that the fotech_menu_bar tag have been
    # used in the browser code.
    def self.menu_javascript(menu, element_id = "menubar")
        str = "var menuItems = [\n"
        menu.length.times { |i|
            str.concat(menu_str(menu[i]))
            str.concat ",\n"
        }
        str.concat "];\n"
        str.concat <<HERE
jsmenubar = new YAHOO.widget.MenuBar("mymenubar", {lazyload: false, itemdata: menuItems });
YAHOO.util.Dom.addClass(jsmenubar.element, "yuimenubarnav");
jsmenubar.render(document.getElementById("#{element_id}"));
HERE
        return str.html_safe
    end

    private

    # Given a menu item configuration hash this will return the javascript code required
    # to prepare the menu item for the YAHOO MenuBar call.
    def self.menu_str( m )
        if m.empty?
            return "],["
        end

        need_comma = false
        str = "{"
        if m.has_key? :name
            str.concat(',') if need_comma
            str.concat('id: "' + m[:name] + '"')
            need_comma = true
        end
        if m.has_key? :label
            str.concat(',') if need_comma
            str.concat('text: "' + m[:label] + '"')
            need_comma = true
        elsif m.has_key? :name
            str.concat(',') if need_comma
            str.concat('text: "<em id=\"' + m[:name] + '\">[Image]</em>"')
            need_comma = true
        end
        if m.has_key? :url
            str.concat(',') if need_comma
            str.concat('url: "' + m[:url] + '"')
            need_comma = true
        end
        if m.has_key? :classname
            str.concat(',') if need_comma
            str.concat('classname: "' + m[:classname] + '"')
            need_comma = true
        end
        if m.has_key? :newPage and m[:newPage] == true
            str.concat(',') if need_comma
            str.concat('target: "_new"')
            need_comma = true
        end
        if m.has_key? :disabled and m[:disabled] == true
            str.concat(',') if need_comma
            str.concat('disabled: true')
            need_comma = true
        end
        if m.has_key? :checked
            if m[:checked] == true
                str.concat(',') if need_comma
                str.concat('checked: true')
                need_comma = true
            end
            str.concat(',') if need_comma
            str.concat('onclick:{fn: fotech.gui.toggleCheckCallback}')
            need_comma = true
        end
        if m.has_key? :submenu
            str.concat(',') if need_comma
            str.concat('submenu: {')
            if m.has_key? :name
                str.concat('id: "' + m[:name] + '",')
            end
            str.concat('itemdata: [[')
            need_comma_1 = false
            m[:submenu].length.times do |i|
                str.concat(',') if need_comma_1
                str.concat(menu_str(m[:submenu][i]))
                need_comma_1 = true
            end
            str.concat(']] }')
            need_comma = true
        end
        str.concat("}")
        return str
    end

end

