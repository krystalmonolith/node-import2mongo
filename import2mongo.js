// Resume JSON File -> MongoDB Collection Loader
// Copyright (c) 2016-2017 by AlphaPulsar LLC
// All Rights Reserved.
// Author: Mark Deazley

'use strict';

const fs = require('fs');
const uuids = require('node-uuid');
const sjcl = require('sjcl');
const ObjectID = require('mongodb').ObjectID;
const MongoClient = require('mongodb').MongoClient;
const GridStore = require('mongodb').GridStore;

function errexit(err, msg) {
  let m = msg ? msg : "";
  m = "ERRMSG" + (err ? ": " + err + " ": "! ") + m;
  console.error(m);
  process.exit(-1);
}

function loadFile(inputFile) {
    return new Promise((resolve, reject) => {
        fs.readFile(inputFile, (err,data) => {
            if (err) {
                reject("InputFile: " + inputFile + " Err:" + err);
            } else {
                resolve(data);
            }
        });
    });
}

let mimeLookup = {
  "bmp":  { "mimetype":"image/bmp",     "desc":"[Windows BMP]" },
  "fits": { "mimetype":"image/fits",    "desc":"[RFC4047]" },
  "gif":  { "mimetype":"image/gif",     "desc":"[RFC2045][RFC2046]" },
  "jpeg": { "mimetype":"image/jpeg",    "desc":"[RFC2045][RFC2046]" },
  "png":  { "mimetype":"image/png",     "desc":"[Portable Network Graphics]" },
  "svg":  { "mimetype":"image/svg+xml", "desc":"[W3C http://www.w3.org/TR/SVG/mimereg.html]" },
  "tiff": { "mimetype":"image/tiff",    "desc":"[Tag Image File Format: RFC3302]" },
  "wmf":  { "mimetype":"image/wmf",     "desc":"[Windows WMF]" }
};

function getMimeType(inputFile) {
  let mtype = 'application/octet-stream';
  let ext = inputFile.replace(/.+\.(\S+)$/ , "$1");
  ext = ext.toLowerCase();
  if (ext) {
    mtype = mimeLookup[ext] ? mimeLookup[ext].mimetype : mtype;
    console.log("INPUTFILE: " + inputFile + " EXT: " + ext + " MIMETYPE: " + mtype);
  }
  return mtype;
}

function storeToGFS(db, file) {
  let uuid = uuids.v4();
  let oid = new ObjectID();
  console.log("START-GFS: " + file + " => (OID,UUID): (" + oid + "," + uuid + ")");
  return new Promise((resolve,reject) => {
    console.log("OPEN-GFS: " + file + " => (OID,UUID): (" + oid + "," + uuid + ")");
    let mimetype = getMimeType(file);
    let gridstore = new GridStore(db, oid , file, 'w', { "content_type": mimetype });
    gridstore.open()
      .then(function(gridstore) {
        console.log("WRITE-GFS: " + file + " => (OID,UUID): (" + oid + "," + uuid + ")");
        gridstore.writeFile(file)
        .then((doc) => {
          console.log("END-GFS: " + file + " => (OID,UUID): (" + oid + "," + uuid + ")");
          resolve(oid);
        })
        .catch((err) => errexit(err, "gridstore.writeFile: " + file));
      })
      .catch((err) => errexit(err, "gridstore.open: " + file));
  });
}

function storeImagesInfoGFS(db, json) {
  let allPromises = [];
  if (json.person.images) {
    json.person.images.forEach(iobj => {
        if (iobj.file) {
          allPromises.push(
            storeToGFS(db, iobj.file)
            .then(oid => iobj.oid = oid)
            .catch(err => { err.file = iobj.file; throw err;})
          );
        }
      }
    )
  }
  console.log("GFS-LOOP-EXIT: length: " + allPromises.length + " : " + json.title);
  return Promise.all(allPromises);
}

function parseJSON(data, inputFile) {
    let json;
    try {
        json = JSON.parse(data);
    } catch (e) {
        console.error("JSON Parsing Error[" + inputFile + "]: " + e.stack);
        console.error("\n\"DATA\":" + data);
        process.exit(-2);
    }
    json.insertTimeStamp = new Date();
    json.updateTimeStamp = null;
    //console.log("JSON:" + JSON.stringify(json, null, '  '));
    return json;
}

function insertDocument(database, collection, inputFile, json) {
    let url = 'mongodb://localhost:27017/' + database;
    MongoClient.connect(url).then((db) => {
      console.log("DBOPEN insertDocument \"" + collection + "\": Connected: \"" + url + "\" : " + json.title);
      storeImagesInfoGFS(db, json).then(() => {
        db.collection(collection).insertOne(json)
        .then((result) => {
          db.stats({ scale: 1024} , (err,stats) => {
            if (err) errexit(err);
            console.log("DBCLOSE - SUCCESS LOADING: " + inputFile + "\n" + JSON.stringify(stats,null,2));
            db.close();
          });
        })
        .catch(err => errexit(err));
      })
      .catch(err => errexit(err));
    })
    .catch(err => errexit(err));
}

function dropCollection(database, collection) {
    let url = 'mongodb://localhost:27017/' + database;
    MongoClient.connect(url).then((db) => {
        console.log("DBOPEN dropCollection \"" + collection + "\": Connected: \"" + url + "\"");
        db.collection(collection).drop()
        .then((result) => {
            console.log("DBCLOSE - SUCCESS DROPPING: " + database + "/" + collection + " : " + JSON.stringify(result));
            db.close();
        })
        .catch(err => errexit(err));
    })
    .catch(err => errexit(err));
}

function importFile(database, collection, inputFile) {
    loadFile(inputFile)
    .then((data) => {
        insertDocument(database, collection, inputFile, parseJSON(data, inputFile));
    })
    .catch(err => errexit(err));
}

function main() {
    let node = process.argv.shift();
    let script = process.argv.shift();
    if (process.argv.length < 3) {
        console.error("\nERROR: Insufficient Parameters!\nUsage:\n\t" + node + " " + script + " <database> <collection> <inputfile> [<inputfile>...]\n");
        process.exit(-3);
    }
    let database = process.argv.shift();
    let collection = process.argv.shift();
    if (process.argv[0].toUpperCase() == "DROP") {
            dropCollection(database, collection);
    } else {
        process.argv.forEach((inputFile) => {
            console.log("INPUTFILE: " + inputFile);
            importFile(database, collection, inputFile);
        });
    }
}

main();
