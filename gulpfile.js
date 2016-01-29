var gulp = require('gulp');
var gutil = require('gulp-util');
var bower = require('bower');
var concat = require('gulp-concat');
var sass = require('gulp-sass');
var minifyCss = require('gulp-minify-css');
var rename = require('gulp-rename');
var sh = require('shelljs');
var del = require('del');
var manifest = require('gulp-manifest');
var processhtml = require('gulp-processhtml')
var merge = require('merge-stream');
var couchapp = require('gulp-couchapp');
var config_web = require('./config-web.json');
var templateCache = require('gulp-angular-templatecache');
var uglify = require('gulp-uglify');
var concat = require('gulp-concat');
var rename = require("gulp-rename");
var ngAnnotate = require('gulp-ng-annotate');
var usemin = require('gulp-usemin');
require('gulp-grunt')(gulp);
var paths = {
    sass: ['./scss/**/*.scss']
};

gulp.task('default', ['sass']);

gulp.task('sass', function (done) {
    gulp.src('./scss/ionic.app.scss')
        .pipe(sass({
            errLogToConsole: true
        }))
        .pipe(gulp.dest('./app/css/'))
        .pipe(minifyCss({
            keepSpecialComments: 0
        }))
        .pipe(rename({
            extname: '.min.css'
        }))
        .pipe(gulp.dest('./app/css/'))
        .on('end', done);
});

gulp.task('watch', function () {
    gulp.watch(paths.sass, ['sass']);
});

gulp.task('install', ['git-check'], function () {
    return bower.commands.install()
        .on('log', function (data) {
            gutil.log('bower', gutil.colors.cyan(data.id), data.message);
        });
});

gulp.task('git-check', function (done) {
    if (!sh.which('git')) {
        console.log(
            '  ' + gutil.colors.red('Git is not installed.'),
            '\n  Git, the version control system, is required to download Ionic.',
            '\n  Download git here:', gutil.colors.cyan('http://git-scm.com/downloads') + '.',
            '\n  Once git is installed, run \'' + gutil.colors.cyan('gulp install') + '\' again.'
            );
        process.exit(1);
    }
    done();
});

var copyWeb = function (sti) {
    var merged = merge(gulp.src('./app/index_min.html').pipe(rename("index.html")).pipe(gulp.dest(sti)), gulp.src('./app/css/ionic.app.min.css').pipe(gulp.dest(sti + '/css')));
    merged.add(gulp.src('./app/redirect.html').pipe(gulp.dest(sti)));
    merged.add(gulp.src('./app/img/*.*').pipe(gulp.dest(sti + '/img')));
    merged.add(gulp.src('./app/js/leaflet/**/*.*').pipe(gulp.dest(sti + '/js/leaflet')));
    merged.add(gulp.src('./app/js/idb-database.js').pipe(gulp.dest(sti + '/js')));
    merged.add(gulp.src('./app/js/idb-worker.js').pipe(gulp.dest(sti + '/js')));
    merged.add(gulp.src('./app/js/list-worker.js').pipe(gulp.dest(sti + '/js')));
    merged.add(gulp.src('./app/js/redirect.js').pipe(gulp.dest(sti + '/js')));
    merged.add(gulp.src('./app/lib/angular-i18n/angular-locale_da-dk.js').pipe(gulp.dest(sti + '/lib/angular-i18n')));
    merged.add(gulp.src('./app/lib/angular-utf8-base64/angular-utf8-base64.min.js').pipe(gulp.dest(sti + '/lib/angular-utf8-base64')));
    merged.add(gulp.src('./app/lib/blob-util/dist/blob-util.min.js').pipe(gulp.dest(sti + '/lib/blob-util/dist')));
    merged.add(gulp.src('./app/lib/ionic/js/ionic.bundle.js').pipe(gulp.dest(sti + '/lib/ionic/js')));
    merged.add(gulp.src('./app/lib/ionic/fonts/*.*').pipe(gulp.dest(sti + '/lib/ionic/fonts')));
    merged.add(gulp.src('./app/lib/leaflet-cache/{L.Icon.Cache.Blob,L.TileLayer.Cache.Blob10}.js').pipe(gulp.dest(sti + '/lib/leaflet-cache')));
    merged.add(gulp.src('./app/lib/leaflet-usermarker/src/**/*.*').pipe(gulp.dest(sti + '/lib/leaflet-usermarker/src')));
    merged.add(gulp.src('./app/lib/leaflet.editable/src/Leaflet.Editable.js').pipe(gulp.dest(sti + '/lib/leaflet.editable/src')));
    merged.add(gulp.src('./app/lib/leaflet.markercluster/dist/{*.css,leaflet.markercluster.js}').pipe(gulp.dest(sti + '/lib/leaflet.markercluster/dist')));
    merged.add(gulp.src('./app/lib/lie/dist/lie.polyfill.min.js').pipe(gulp.dest(sti + '/lib/lie/dist')));
    merged.add(gulp.src('./app/lib/ngCordova/dist/ng-cordova.min.js').pipe(gulp.dest(sti + '/lib/ngCordova/dist')));
    merged.add(gulp.src('./app/lib/ngstorage/ngStorage.min.js').pipe(gulp.dest(sti + '/lib/ngstorage')));
    merged.add(gulp.src('./app/lib/proj4/dist/proj4.js').pipe(gulp.dest(sti + '/lib/proj4/dist')));
    merged.add(gulp.src('./app/lib/proj4leaflet/src/proj4leaflet.js').pipe(gulp.dest(sti + '/lib/proj4leaflet/src')));
    merged.add(gulp.src('./app/lib/socket.io-client/socket.io.js').pipe(gulp.dest(sti + '/lib/socket.io-client')));
    merged.add(gulp.src('./app/lib/turf/turf.min.js').pipe(gulp.dest(sti + '/lib/turf')));
    merged.add(gulp.src('./app/lib/tv4/tv4.js').pipe(gulp.dest(sti + '/lib/tv4')));
    merged.add(gulp.src('./app/lib/node-uuid/uuid.js').pipe(gulp.dest(sti + '/lib/node-uuid')));
    return merged;
};


var copyCordova = function (fra, til) {
    var merged = merge(gulp.src(fra + '/plugins/**/*.*').pipe(gulp.dest(til + '/plugins')), gulp.src(fra + '/cordova*.*').pipe(gulp.dest(til)));
    merged.add(gulp.src(fra + '/index.html').pipe(processhtml()).pipe(gulp.dest(til)));
    return merged;
}
gulp.task('clean', function () {
    return del('www');
});
gulp.task('ios-del', function () {
    return del('couchapp-ios');
});
gulp.task('android-del', function () {
    return del('couchapp-android');
});
gulp.task('copy', ['clean'], function () {
    return copyWeb('./www');
});
gulp.task('ios-copy', ['ios-del'], function () {
    var merged = merge(copyWeb('./couchapp-ios'), copyCordova('./platforms/ios/www', './couchapp-ios'));
    return merged;
});

gulp.task('android-copy', ['android-del'], function () {
    var merged = merge(copyWeb('./couchapp-android'), copyCordova('./platforms/android/assets/www', './couchapp-android'));
    return merged;
});


gulp.task('ios-manifest', ['ios-copy'], function () {
    gulp.src(['couchapp-ios/**/*.*'], { base: './couchapp-ios' })
        .pipe(manifest({
            hash: true,
            /*preferOnline: true,*/
            cache: ["lib/ionic/fonts/ionicons.eot?v=2.0.1", "lib/ionic/fonts/ionicons.ttf?v=2.0.1", "lib/ionic/fonts/ionicons.woff?v=2.0.1"],
            exclude: ["lib/ionic/fonts/ionicons.eot", "lib/ionic/fonts/ionicons.ttf", "lib/ionic/fonts/ionicons.woff", "manifest.appcache"],
            network: ['*'],
            filename: 'manifest.appcache'
        }))
        .pipe(gulp.dest('couchapp-ios'));
});

gulp.task('android-manifest', ['android-copy'], function () {
    gulp.src(['couchapp-android/**/*.*'], { base: './couchapp-android' })
        .pipe(manifest({
            hash: true,
            /*preferOnline: true,*/
            cache: ["lib/ionic/fonts/ionicons.eot?v=2.0.1", "lib/ionic/fonts/ionicons.ttf?v=2.0.1", "lib/ionic/fonts/ionicons.woff?v=2.0.1"],
            exclude: ["lib/ionic/fonts/ionicons.eot", "lib/ionic/fonts/ionicons.ttf", "lib/ionic/fonts/ionicons.woff", "manifest.appcache"],
            network: ['*'],
            filename: 'manifest.appcache'
        }))
        .pipe(gulp.dest('couchapp-android'));
});

gulp.task('web-manifest', ['web-copy'], function () {
    gulp.src(['couchapp-web/**/*.*'], { base: './couchapp-web' })
        .pipe(manifest({
            hash: true,
            /*preferOnline: true,*/
            cache: ["lib/ionic/fonts/ionicons.eot?v=2.0.1", "lib/ionic/fonts/ionicons.ttf?v=2.0.1", "lib/ionic/fonts/ionicons.woff?v=2.0.1"],
            exclude: ["lib/ionic/fonts/ionicons.eot", "lib/ionic/fonts/ionicons.ttf", "lib/ionic/fonts/ionicons.woff", "manifest.appcache"],
            network: ['*'],
            filename: 'manifest.appcache'
        }))
        .pipe(gulp.dest('couchapp-web'));
});

gulp.task('ios-deploy', ['ios-manifest'], function () {
    return gulp.src('couchapp-ios.js')
        .pipe(couchapp.push('couchdb/app-d2121ee08caf832b73a160f9ea022ad9', config_ios));
});
gulp.task('android-deploy', ['android-manifest'], function () {
    return gulp.src('couchapp-android.js')
        .pipe(couchapp.push('couchdb/app-d2121ee08caf832b73a160f9ea022ad9', config_android));
});
gulp.task('web-deploy', function () {
    return gulp.src('couchapp-web.js')
        .pipe(couchapp.push('couchdb/app-d2121ee08caf832b73a160f9ea022ad9', config_web));
});
gulp.task('template-cache', function () {
    return gulp.src('app/templates/**/*.html')
        .pipe(templateCache({
            root: 'templates/'
        }))
        .pipe(gulp.dest('app/js'));
});
gulp.task('compress', function () {
    return gulp.src('lib/*.js')
        .pipe(uglify())
        .pipe(gulp.dest('dist'));
});


gulp.task('minify', ['template-cache'], function () {
    return gulp.src([
        'app/js/angular-ios9-uiwebview.patch.js',
        'app/js/idb-database.js',
        'app/js/idb.js',
        'app/js/leaflet.zoomdisplay.js',
        'app/js/filters.js',
        'app/js/directives.js',
        'app/js/services.js',
        'app/js/app.js',
        'app/js/templates.js',
        'app/js/controller-login.js',
        'app/js/controller-organizations.js',
        'app/js/controller-organization.js',
        'app/js/controller-menu.js',
        'app/js/controller-map.js',
        'app/js/controller-intro.js'
    ])
        .pipe(concat('all.js'))
        .pipe(ngAnnotate())
        .pipe(uglify())
        .pipe(gulp.dest('www/js'));
});
