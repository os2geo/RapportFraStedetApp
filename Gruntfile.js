module.exports = function (grunt) {

    // Project configuration.
    grunt.initConfig({
        pkg: grunt.file.readJSON('package.json'),
        'couch-compile': {
            app: {
                files: {
                    'tmp/app.json': 'dist'
                }
            }
        },
        'couch-push': {

            deployApp: {
                options: {
                    user: 'admin',
                    pass: 'wont775dock'
                },
                files: {
                    'http://data.kosgis.dk/couchdb/app-d2121ee08caf832b73a160f9ea022ad9': 'tmp/app.json'
                }
            },
            deployAddindk: {
                options: {
                    user: 'admin',
                    pass: 'stone64cola'
                },
                files: {
                    'http://geo.addin.dk/couchdb/app-b925d6f79133a626d3f944af350691ef': 'tmp/app.json'
                }
            },
            localApp: {
                files: {
                    'http://admin:rutv2327@localhost:5984/app-3495ccf8aafcb1541a0ef7cc2d01178e': 'tmp/app.json'
                }
            }
        },
        copy: {
            web: {
                expand: true,
                cwd: 'www/',
                src: '**/*',
                dest: 'dist/_attachments/web'
            },
            android: {
                expand: true,
                cwd: 'platforms/android/assets/www/',
                src: '**/*',
                dest: 'dist/_attachments/android'
            },
            ios: {
                expand: true,
                cwd: 'platforms/ios/www/',
                src: '**/*',
                dest: 'dist/_attachments/ios'
            },
            windows: {
                expand: true,
                cwd: 'platforms/windows/www/',
                src: '**/*',
                dest: 'dist/_attachments/windows'
            }
        },
        processhtml: {
            options: {
                // Task-specific options go here.
            },
            dist: {
                files: {
                    'dist/_attachments/web/index.html': ['www/index.html']
                }
            },
        },
        exec: {
            prepare: 'cordova prepare'
        },
        manifest: {
            www: {
                options: {
                    basePath: "www",
                    cache: ["lib/ionic/fonts/ionicons.eot?v=1.5.2", "lib/ionic/fonts/ionicons.ttf?v=1.5.2", "lib/ionic/fonts/ionicons.woff?v=1.5.2"],
                    network: ["*"],
                    /*fallback: ["/ /offline.html"],*/
                    exclude: ["lib/ionic/fonts/ionicons.eot", "lib/ionic/fonts/ionicons.ttf", "lib/ionic/fonts/ionicons.woff", "manifest.appcache", "lib/Leaflet.functionaltilelayer"],
                    /*preferOnline: true,*/
                    verbose: true,
                    timestamp: true
                },
                src: ['**/*.*'],
                dest: "www/manifest.appcache"
            },
            web: {
                options: {
                    basePath: "dist/_attachments/web",
                    cache: ["lib/ionic/fonts/ionicons.eot?v=1.5.2", "lib/ionic/fonts/ionicons.ttf?v=1.5.2", "lib/ionic/fonts/ionicons.woff?v=1.5.2"],
                    network: ["*"],
                    /*fallback: ["/ /offline.html"],*/
                    exclude: ["lib/ionic/fonts/ionicons.eot", "lib/ionic/fonts/ionicons.ttf", "lib/ionic/fonts/ionicons.woff", "manifest.appcache", "lib/Leaflet.functionaltilelayer", "lib/leaflet.markercluster"],
                    /*preferOnline: true,*/
                    verbose: true,
                    timestamp: true
                },
                src: ['**/*.*'],
                dest: "dist/_attachments/web/manifest.appcache"
            },
            android: {
                options: {
                    basePath: "dist/_attachments/android",
                    cache: ["lib/ionic/fonts/ionicons.eot?v=1.5.2", "lib/ionic/fonts/ionicons.ttf?v=1.5.2", "lib/ionic/fonts/ionicons.woff?v=1.5.2"],
                    network: ["*"],
                    /*fallback: ["/ /offline.html"],*/
                    exclude: ["lib/ionic/fonts/ionicons.eot", "lib/ionic/fonts/ionicons.ttf", "lib/ionic/fonts/ionicons.woff", "manifest.appcache", "plugins/com.brodysoft.sqlitePlugin", "plugins/org.apache.cordova.dialogs", "plugins/nl.x-services.plugins.launchmyapp", "plugins/com.ionic.keyboard", "plugins/org.apache.cordova.camera", "plugins/org.apache.cordova.device", "plugins/org.apache.cordova.file", "plugins/org.apache.cordova.inappbrowser", "plugins/org.apache.cordova.file-transfer", "plugins/org.apache.cordova.network-information", "plugins/org.transistorsoft.cordova.background-geolocation", "plugins/org.apache.cordova.geolocation", "lib/Leaflet.functionaltilelayer", "lib/leaflet.markercluster"],
                    /*preferOnline: true,*/
                    verbose: true,
                    timestamp: true
                },
                src: ['**/*.*'],
                dest: "dist/_attachments/android/manifest.appcache"
            },
            ios: {
                options: {
                    basePath: "dist/_attachments/ios",
                    cache: ["lib/ionic/fonts/ionicons.eot?v=1.5.2", "lib/ionic/fonts/ionicons.ttf?v=1.5.2", "lib/ionic/fonts/ionicons.woff?v=1.5.2"],
                    network: ["*"],
                    /*fallback: ["/ /offline.html"],*/
                    exclude: ["lib/ionic/fonts/ionicons.eot", "lib/ionic/fonts/ionicons.ttf", "lib/ionic/fonts/ionicons.woff", "manifest.appcache", "plugins/com.brodysoft.sqlitePlugin", "plugins/org.apache.cordova.dialogs", "plugins/nl.x-services.plugins.launchmyapp", "plugins/com.ionic.keyboard", "plugins/org.apache.cordova.camera", "plugins/org.apache.cordova.device", "plugins/org.apache.cordova.file", "plugins/org.apache.cordova.inappbrowser", "plugins/org.apache.cordova.file-transfer", "plugins/org.apache.cordova.network-information", "plugins/org.transistorsoft.cordova.background-geolocation", "plugins/org.apache.cordova.console", "plugins/org.apache.cordova.geolocation", "lib/Leaflet.functionaltilelayer", "lib/leaflet.markercluster"],
                    /*preferOnline: true,*/
                    verbose: true,
                    timestamp: true
                },
                src: ['**/*.*'],
                dest: "dist/_attachments/ios/manifest.appcache"
            },
            windows: {
                options: {
                    basePath: "dist/_attachments/ios",
                    cache: ["lib/ionic/fonts/ionicons.eot?v=1.5.2", "lib/ionic/fonts/ionicons.ttf?v=1.5.2", "lib/ionic/fonts/ionicons.woff?v=1.5.2"],
                    network: ["*"],
                    /*fallback: ["/ /offline.html"],*/
                    exclude: ["lib/ionic/fonts/ionicons.eot", "lib/ionic/fonts/ionicons.ttf", "lib/ionic/fonts/ionicons.woff", "manifest.appcache", "plugins/com.brodysoft.sqlitePlugin", "plugins/org.apache.cordova.dialogs", "plugins/nl.x-services.plugins.launchmyapp", "plugins/com.ionic.keyboard", "plugins/org.apache.cordova.camera", "plugins/org.apache.cordova.device", "plugins/org.apache.cordova.file", "plugins/org.apache.cordova.inappbrowser", "plugins/org.apache.cordova.file-transfer", "plugins/org.apache.cordova.network-information", "plugins/org.transistorsoft.cordova.background-geolocation", "plugins/org.apache.cordova.console", "plugins/org.apache.cordova.geolocation", "lib/Leaflet.functionaltilelayer", "lib/leaflet.markercluster"],
                    /*preferOnline: true,*/
                    verbose: true,
                    timestamp: true
                },
                src: ['**/*.*'],
                dest: "dist/_attachments/ios/manifest.appcache"
            }
        }
    });

    // Load the plugin that provides the "uglify" task.
    grunt.loadNpmTasks('grunt-couch');
    grunt.loadNpmTasks('grunt-contrib-copy');
    grunt.loadNpmTasks('grunt-processhtml');
    grunt.loadNpmTasks('grunt-exec');
    grunt.loadNpmTasks('grunt-manifest');
    grunt.loadNpmTasks('grunt-preen');
    // Default task(s).
    grunt.registerTask('del', ['preen']);
    grunt.registerTask('default', ['couch-compile']);
    grunt.registerTask('push', ['copy:web','couch-compile:app','couch-push:localApp']);
    grunt.registerTask('couch', ['copy:web','couch-compile:app', 'couch-push:deployApp']);
    grunt.registerTask('addin.dk', ['exec', 'copy', 'processhtml', 'manifest', 'couch-compile:app', 'couch-push:deployAddindk']);
    grunt.registerTask('dist', ['exec', 'copy', 'processhtml', 'manifest', 'couch-compile:app', 'couch-push:deployApp']);
    grunt.registerTask('dev', ['exec', 'copy', 'processhtml', 'manifest', 'couch-compile:app', 'couch-push:localApp']);
    grunt.registerTask('appcache', ['manifest:www']);
    grunt.registerTask('pouch', [ 'copy:web', 'couch-compile:app', 'couch-push:deployApp']);
};