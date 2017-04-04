# node-import2mongo
## JSON text file import to a MongoDB Collection + GFS image files with Node.js and NPM's mongodb.

* This JavaScript code example imports the content of a JSON text file into a MongoDB Collection.
* It checks each person's record in the imported JSON for a `person.images` key, and if present uses the array of filename value(s) to read image file(s) from the file system and write(s) them into MongoDB's GFS as BLOB(s) annotated with UUIDs and MIME type metadata.
* Implemented using Node.js and NPM's "mongodb" package.

See `run.sh` for an invocation example.
