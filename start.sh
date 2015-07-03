#!/bin/sh
cd /home/hitman/btcdd/src
./BitcoinDarkd

cd

sleep 10

cd /home/hitman/insight/
export INSIGHT_NETWORK="livenet"
export PATH=/usr/local/bin:$PATH
export INSIGHT_PUBLIC_PATH="public"
forever start node_modules/.bin/insight-bitcore-api
