#!/bin/sh
echo 'Starting jobtracking (nohup) log are in logs/jobtracking.log'
nohup nodejs jobtracking.js > /dev/null &

