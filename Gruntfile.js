module.exports = function (grunt) {
  grunt.initConfig({
    pkg: grunt.file.readJSON('package.json'),
    jsonmanifest: {
      generate: {
        options: {
          basePath: 'couchapp-web',
          exclude: [],
          //load all found assets
          loadall: false,
          //manually add files to the manifest
          files: {},
          //manually define the files that should be injected into the page
          load: [

            "js/leaflet/leaflet.css",
            "lib/leaflet-usermarker/src/leaflet.usermarker.css",
            "lib/leaflet.markercluster/dist/MarkerCluster.css",
            "lib/leaflet.markercluster/dist/MarkerCluster.Default.css",
            "css/ionic.app.min.css",
            "lib/ionic/js/ionic.bundle.js",
            "js/leaflet/leaflet.js",
            "lib/angular-i18n/angular-locale_da-dk.js",
            "lib/angular-utf8-base64/angular-utf8-base64.min.js",
            "lib/blob-util/dist/blob-util.min.js",
            "lib/leaflet-cache/L.Icon.Cache.Blob.js",
            "lib/leaflet-cache/L.TileLayer.Cache.Blob10.js",
            "lib/leaflet-usermarker/src/leaflet.usermarker.js",
            "lib/leaflet.editable/src/Leaflet.Editable.js",
            "lib/leaflet.markercluster/dist/leaflet.markercluster.js",
            "lib/ngCordova/dist/ng-cordova.min.js",
            "lib/ngstorage/ngStorage.min.js",
            "lib/proj4/dist/proj4.js",
            "lib/proj4leaflet/src/proj4leaflet.js",
            "lib/socket.io-client/socket.io.js",
            "lib/turf/turf.min.js",
            "lib/tv4/tv4.js",
            "lib/node-uuid/uuid.js",
            "js/all.js"
          ],
          // root location of files to be loaded in the load array.
          root: "./"
        },
        src: [
          'js/**/*.*',
          'css/ionic.app.min.css',
          'img/*.*',
          'lib/angular-i18n/angular-locale_da-dk.js',
          'lib/angular-utf8-base64/angular-utf8-base64.min.js',
          'lib/blob-util/dist/blob-util.min.js',
          'lib/ionic/js/ionic.bundle.js',
          'lib/ionic/fonts/*.*',
          'lib/leaflet-cache/{L.Icon.Cache.Blob,L.TileLayer.Cache.Blob10}.js',
          'lib/leaflet-usermarker/src/**/*.*',
          'lib/leaflet.editable/src/Leaflet.Editable.js',
          'lib/leaflet.markercluster/dist/{*.css,leaflet.markercluster.js}',
          'lib/lie/dist/lie.polyfill.min.js',
          'lib/ngCordova/dist/ng-cordova.min.js',
          'lib/ngstorage/ngStorage.min.js',
          'lib/proj4/dist/proj4.js',
          'lib/proj4leaflet/src/proj4leaflet.js',
          'lib/socket.io-client/socket.io.js',
          'lib/turf/turf.min.js',
          'lib/tv4/tv4.js',
          'lib/node-uuid/uuid.js'
        ],
        dest: ['couchapp-web/manifest.json']
      }
    }
  });
  /* This generates a manifest file for use with the cordova-app-loader tool:
  * https://github.com/markmarijnissen/cordova-app-loader
  */
  
  /*
  * You can add settings to your grunt initConfig
  
    //jsonmanifest settings
    jsonmanifest: {
      generate: {
        options: {
          basePath: 'where/you/files/live/www',
          exclude: [],
          //load all found assets
          loadall: true,
          //manually add files to the manifest
          files: {},
          //manually define the files that should be injected into the page
          load: [],
          // root location of files to be loaded in the load array.
          root: "./"
        },
        src: [
            'js/*.js',
            'css/*.css'
        ],
        dest: ['manifest.json']
      }
    }
  
  */
  
  /*
  * Example Output of task
  
  {
    "files": {
      "bv-cordova.js": {
        "filename": "js/089775a3-bv-cordova.js",
        "version": "98af580a8bc88ee0ca248a99c975f29a55d8b99324c151a347afef2994327699"
      },
      "vendor.js": {
        "filename": "js/7230ca97-vendor.js",
        "version": "f3e66d9576c6f9e0bbd262e303a1fffa32812aa298f1a104cbb4fc9dacb2a38f"
      },
      "bv.js": {
        "filename": "js/b68ba6b1-bv.js",
        "version": "0ffb0ce5253d25fde5786ac06f89aa18586581817c0848ad7fb6f36eba68d2a0"
      },
      "bv-base.css": {
        "filename": "css/36e2074b-bv-base.css",
        "version": "ff612bd05801e08367ab5c16f96f31a6a93cfb85f2c4374d3b0f50fa56677978"
      },
      "bv-desktop.css": {
        "filename": "css/3eb2ced8-bv-desktop.css",
        "version": "b0bb89274a5c9a4efc441bd541e9fbb2e7da9efb13c09f85cd9f517f25b72a49"
      }
    },
    "load": [
      "js/089775a3-bv-cordova.js",
      "js/7230ca97-vendor.js",
      "js/b68ba6b1-bv.js",
      "css/36e2074b-bv-base.css",
      "css/3eb2ced8-bv-desktop.css"
    ],
    "root": "./"
  }
  */
  
  
  //GRUNT TASK TO BUILD A JSON MANIFEST FILE FOR HOT CODE UPDATES
  grunt.registerMultiTask('jsonmanifest', 'Generate JSON Manifest for Hot Updates', function () {

    var options = this.options({ loadall: true, root: "./", files: {}, load: [] });
    var done = this.async();

    var path = require('path');

    this.files.forEach(function (file) {
      var files;

      //manifest format
      var json = {
        "files": options.files,
        "load": options.load,
        "root": options.root
      };

      //clear load array if loading all found assets
      if (options.loadall) {
        json.load = [];
      }

      // check to see if src has been set
      if (typeof file.src === "undefined") {
        grunt.fatal('Need to specify which files to include in the json manifest.', 2);
      }

      // if a basePath is set, expand using the original file pattern
      if (options.basePath) {
        files = grunt.file.expand({ cwd: options.basePath }, file.orig.src);
      } else {
        files = file.src;
      }

      // Exclude files
      if (options.exclude) {
        files = files.filter(function (item) {
          return options.exclude.indexOf(item) === -1;
        });
      }

      // Set default destination file
      if (!file.dest) {
        file.dest = ['manifest.json'];
      }      

      // add files
      if (files) {
        files.forEach(function (item) {

          var isDir = grunt.file.isDir(path.join(options.basePath, item));

          if (!isDir) {

            var hasher = require('crypto').createHash('sha256');
            var filename = encodeURI(item);

            //var key = filename.split("-").slice(1).join('-');
            var key = filename;
            json.files[key] = {};
            json.files[key]['filename'] = filename;
            json.files[key]['version'] = hasher.update(grunt.file.read(path.join(options.basePath, item))).digest("hex");

            if (options.loadall) {
              json.load.push(filename);
            }
          }
        });
      }
      //write out the JSON to the manifest files
      file.dest.forEach(function (f) {
        grunt.file.write(f, JSON.stringify(json, null, 2));
      });

      done();
    });

  });
};