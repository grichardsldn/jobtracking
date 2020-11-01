#!/bin/sh
echo 'Starting jobtracking (nohup) log are in logs/jobtracking.log'
nohup node jobtracking.js > /dev/null &

