#!/bin/bash -x

DBNAME=resume2017
COLLNAME=resumes

mongo $DBNAME -eval 'db.dropDatabase()'
node import2mongo.js $DBNAME $COLLNAME ~/Documents/resume/aen.json
