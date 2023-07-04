#!/bin/sh
#
# COPYRIGHT:
# This file is Copyright © 2019 Fotech Solutions Ltd. All rights reserved.

env=$1
RAILS_ENV=$env IS_DELAYED_JOB=true ./delayed_job stop
