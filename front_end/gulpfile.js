const gulp = require('gulp');
const concat = require('gulp-concat');
const angularOrder = require('gulp-angular-order');
const terser = require('gulp-terser');
const gulpIgnore = require('gulp-ignore');
const gulpBabel = require('gulp-babel');
const through2 = require('through2');
const fs = require('fs');
const revisionHash = require('rev-hash');
const htmlmin = require('gulp-html-minifier-terser');
const cleanCSS = require('gulp-clean-css');

let environment;

function setDevEnvironment(cb) {
  environment = 'dev';
  cb();
}

gulp.task('watch', () => {
  // only use watch for running bundleApp
  gulp.watch(
    [
      'public/angular/**/*.js',
      '!public/angular/libraries/**'],
    gulp.series([setDevEnvironment, bundleApp, processIndexHtml]),
  );
  gulp.watch(
    [
      'public/assets/css/**/*.css',
      '!public/assets/css/main.min.css'],
    gulp.series([setDevEnvironment, minifyCss, processIndexHtml]),
  );
  gulp.watch('src/index.html', processIndexHtml);
});

function bundleApp() {
  let task = gulp.src(
    'public/angular/**/*.js',
    environment === 'dev' ? { sourcemaps: true } : {},
  );

  task = task
    .pipe(gulpIgnore.include(appOnlyInclude))
    .pipe(angularOrder())
    .pipe(concat('app.js'));

  task = task.pipe(gulp.dest(
    'public',
    environment === 'dev' ? { sourcemaps: '.' } : {},
  ));

  return task;
}
const appOnlyInclude = function (file) {
  return !file.path.includes('angular.min') && !file.path.includes('/libraries/');
};

function minifyApp(done) {
  return gulp.src('public/app.js')
    .pipe(
      gulpBabel()
        .on('error', (error) => {
          done(error);
        }),
    )
    .pipe(terser({
      compress: {
        drop_console: true, // remove console logs
        passes: 2,
      },
    }))
    .pipe(gulp.dest('public'));
}

function bundleAngular() {
  let task = gulp.src(
    [
      'public/angular/libraries/ng-file-upload-shim.js',
      'public/angular/angular.min.js',
      'public/angular/libraries/ng-file-upload.js',
      'public/angular/libraries/angular-route.min.js',
      'public/angular/libraries/angular-cookies.min.js',
      'public/angular/libraries/angular-material.min.js',
      'public/angular/libraries/angular-jwt.min.js',
      'public/angular/libraries/angular-tooltips.js',
      'public/angular/libraries/angular-file-saver.js',
      'public/angular/libraries/angular-chart.min.js',
      'public/angular/libraries/select.js',
      'public/angular/libraries/sortable.js',
      'public/angular/libraries/angular-aria.min.js',
      'public/angular/libraries/angular-animate.min.js',
      'public/angular/libraries/angular-sanitize.min.js',
      'public/angular/libraries/ng-infinite-scroll.min.js',
    ],
    environment === 'dev' ? { sourcemaps: true } : {},
  );

  task = task
    .pipe(concat('angularWithLibraries.js'))
    .pipe(terser({
      compress: {
        drop_console: true, // remove console logs
      },
    }));

  task = task.pipe(gulp.dest(
    'public',
    environment === 'dev' ? { sourcemaps: '.' } : {},
  ));

  return task;
}

function minifyCss() {
  let task = gulp.src(
    [
      'public/assets/css/angular-material.min.css',
      'public/assets/css/angular-tooltips.css',
      'public/assets/plugins/pace/pace-theme-flash.css',
      'public/assets/plugins/bootstrapv3/css/bootstrap.min.css',
      'public/assets/plugins/font-awesome/css/font-awesome.css',
      'public/assets/plugins/jquery-scrollbar/jquery.scrollbar.css',
      'public/assets/plugins/switchery/css/switchery.min.css',
      'public/assets/css/pages-icons.css',
      'public/assets/css/google_fonts_montserrat.css',
      'public/assets/css/theme.css',
      'public/assets/css/select.css',
      'public/assets/css/style.css',
    ],
    environment === 'dev' ? { sourcemaps: true } : {},
  );

  task = task
    .pipe(concat('main.min.css'))
    .pipe(cleanCSS({ compatibility: 'ie8' }));

  task = task.pipe(gulp.dest(
    'public/assets/css',
    environment === 'dev' ? { sourcemaps: '.' } : {},
  ));

  return task;
}

function copyCssFonts() {
  return gulp.src([
    'public/assets/plugins/font-awesome/fonts/*.*',
    'public/assets/plugins/bootstrapv3/fonts/*.*',
  ], { encoding: false })
    .pipe(gulp.dest('public/assets/fonts'));
}

function css(done) {
  gulp.series(minifyCss, copyCssFonts)(done);
}

function js() {
  let task = gulp.src(
    [
      'public/assets/plugins/pace/pace.min.js',
      'public/assets/plugins/modernizr.custom.js',
      'public/assets/plugins/jquery-ui/jquery-ui.min.js',
      'public/assets/plugins/bootstrapv3/js/bootstrap.min.js',
      'public/assets/plugins/jquery/jquery-easy.js',
      'public/assets/plugins/jquery-unveil/jquery.unveil.min.js',
      'public/assets/plugins/jquery-bez/jquery.bez.min.js',
      'public/assets/plugins/jquery-ios-list/jquery.ioslist.min.js',
      'public/assets/plugins/jquery-actual/jquery.actual.min.js',
      'public/assets/plugins/jquery-scrollbar/jquery.scrollbar.min.js',
      'public/assets/plugins/classie/classie.js',
      'public/assets/plugins/switchery/js/switchery.min.js',
      'public/assets/plugins/Chart/Chart.min.js',
      'public/assets/js/theme.min.js',
      'public/assets/js/scripts.js',
    ],
    environment === 'dev' ? { sourcemaps: true } : {},
  );

  task = task
    .pipe(concat('main.min.js'))
    .pipe(terser({
      compress: {
        drop_console: true, // remove console logs
      },
    }));

  task = task.pipe(gulp.dest(
    'public/assets/js',
    environment === 'dev' ? { sourcemaps: '.' } : {},
  ));

  return task;
}

function processIndexHtml() {
  return gulp.src('src/index.html')
    .pipe(
      through2.obj((file, _, cb) => {
        if (file.isBuffer()) {
          let html = file.contents.toString();
          const testRE = html.match(/<(script|link).*(src|href)="[^"]*"/g); // find all script and link tags
          for (let i = 0; i < testRE.length; i += 1) {
            const url = testRE[i].replace(/<(script|link).*(src|href)="([^"]*)"/, '$3'); // extract the url from src or href attribute
            // skip any script / link tags that refer to external links
            if (url.indexOf('http') !== 0) {
              // extract a hash from file content.
              const hash = revisionHash(fs.readFileSync(`public/${url}`));
              // and add this as a ?rel= to the url.
              // Note: this hash will only change if the content of the file is changed
              html = html.replace(url, `${url}?rel=${hash}`);
            }
          }
          file.contents = Buffer.from(html);
        }
        cb(null, file);
      }),
    )
    .pipe(htmlmin({ collapseWhitespace: true, removeComments: true })) // minify html
    .pipe(gulp.dest('public'));
}

exports.build = gulp.series(bundleApp, minifyApp, bundleAngular, css, js, processIndexHtml);
exports['build:dev'] = gulp.series(setDevEnvironment, bundleApp, bundleAngular, css, js, processIndexHtml);
