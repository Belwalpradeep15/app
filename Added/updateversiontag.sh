#!/bin/sh

newver=$1
if [ -f version.tag ]; then
	oldver=`cat version.tag`
	if [ "$oldver" != "$newver" ]; then
		echo "$newver" > version.tag
	fi
else
	echo "$newver" > version.tag
fi

