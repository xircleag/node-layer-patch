/*eslint-disable */

module.exports = function(grunt) {

    grunt.initConfig({
        pkg: grunt.file.readJSON('package.json'),

        jasmine: {
          options: {
            helpers: [],
            specs: ['test/*Spec.js'],
            summary: true
          },
          build: {
            src: ['index.js']
          }
        }
    });

    grunt.loadNpmTasks('grunt-contrib-jasmine');

    grunt.registerTask('test', ['jasmine']);
};
