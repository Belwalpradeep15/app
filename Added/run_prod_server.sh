#!/bin/sh
# This script runs a production server at the console serving at port 3000.
#
# This is useful during development to check if the production configuration will work.
# There are some Rails environment variables that are used to control the behaviour of the application.
#
# Note that in real panopte system, the production application will run using apache + passenger.
#
# Please prepare assets before this by invoking ./prepare_assets.sh as producton mode requires this.
set -e
set -v

export PATH=/opt/Fotech/common/ruby/bin:$PATH

RAILS_SERVE_STATIC_FILES=1 RAILS_LOG_TO_STDOUT=1 RAILS_ENV=production bin/rails s
