#!/bin/bash
# $1 new
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"
dataDir="./data"
param="--work-dir $dataDir --config-dir $dataDir --logs-dir $dataDir"
cd $DIR
if [ "$1" = "new" ]; then
	/usr/bin/certbot certonly --manual $param
else
	test=$(/usr/bin/certbot renew $param | grep "No renewals were attempted")
	if [ -z "$test" ]; then
		exit -1
	fi
fi
exit 0
