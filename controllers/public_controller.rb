# $Author$
# $Date$
# $Rev$
# $URL$
#
# COPYRIGHT:
# This file is Copyright (c) 2009 Fotech Solutions Ltd. All rights reserved.

###
# Root controller for all "public" pages, allows for toggling of required authorization in the application_config files
class PublicController < ApplicationController
  helper :all # include all helpers, all the time
end

