module.exports = function (config) {
  config.set({
    frameworks: ['jasmine'],
    browsers: ['PhantomJS'],
    singleRun: false,
    reporters: ['progress'],
    files: [
      'src/**.js',
      'tests/**.js'
    ]
  })
}