#!/bin/sh
#
# Wrapper that creates virtual env and generates yml files.
set -e

./_create_venv.sh

source env/bin/activate

./_generate_yml_files.py

deactivate

