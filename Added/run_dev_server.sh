#!/bin/sh
# This script runs a development server at the console serving at port 3000.
set -e
set -v

export PATH=/opt/Fotech/common/ruby/bin:$PATH

bin/rails s
