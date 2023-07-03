# Darren Taylor
# 2018-01-23
# v0.1
# Help controller /help
#
# COPYRIGHT:
# This file is Copyright (c) 2018 Fotech Solutions Ltd. All rights reserved.
#
require 'json'

class HelpsController < ApplicationController
    # No serious actions here, just a simple GET control which returns the licenses used
    # for the software in question.
    #
    # This list of licenses is supplied to the system in a simple JSON format and
    # can be parsed directly.

    def show
        @pdfs = []
        Dir.chdir("#{Rails.root}/public/") do
            @pdfs = Dir.glob('documents/*.pdf')
        end

        render :layout => false, :template => 'help/help'
    end
end
