# node-import2mongo
## JSON text file import to a MongoDB Collection + GFS image files with Node.js and NPM's mongodb.

* This Javascript code example imports the content in a JSON text file into a MongoDB Collection.
* It checks the json for a `person.images` key in the imported JSON and if present uses the filename value to read and store an image file(s) into MongoDB's GFS as BLOBs.
* Implemented using Node.js and NPM's "mongodb" package.

See `run.sh` for an invocation example.
