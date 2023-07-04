#!/bin/sh
# Create virtual env with pip packages available locally.
set -e

/opt/Fotech/common/python/bin/python3 -m venv ./env
. ./env/bin/activate

PACKS=`pwd`/packages

pip install --upgrade pip --no-index --find-links=file://$PACKS
pip install --requirement requirements.txt --no-index --find-links=file://$PACKS

