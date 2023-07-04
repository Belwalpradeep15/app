#!/bin/sh
#
# FILENAME:     init_delayed_jobs.sh
# AUTHOR:       Steven Klassen
# CREATED ON:   2011-01-18
#
# DESCRIPTION:  Clear out the temporary pids and start the delayed jobs.
#
# COPYRIGHT:
# This file is Copyright © 2011 Fotech Solutions Ltd. All rights reserved.

env=$1
rm -f ../tmp/pids/delayed_job.pid
sleep 5
RAILS_ENV=$env IS_DELAYED_JOB=true ./delayed_job start

