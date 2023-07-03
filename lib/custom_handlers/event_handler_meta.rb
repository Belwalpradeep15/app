# FILENAME:     event_handler_meta.rb
# AUTHOR:       Karina Simard
# CREATED ON:   10-09-15
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
# This file is Copyright © 2010 Fotech Solutions Ltd. All rights reserved.


module CustomHandlers

    # Meta-data describing a custom event handler.
    class EventHandlerMeta
        # Create a handler with a fully scoped action and parameters. Note that the action
        # should take two parameters, an Event object and a dictionary of parameters that 
        # were defined in the XML. It should also return a boolean. If it returns true
        # then we will stop any further custom processing.
        def initialize(action, params)
            @action = action
            @params = params
        end
        
        # Return the fully scoped name of the action that implements the handler.
        def action
            return @action
        end
        
        # Return the parameter dictionary.
        def parameters
            return @params
        end
    end
    
end

