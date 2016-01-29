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
            src: ['layer-patch.js']
          }
        }
    });

    grunt.loadNpmTasks('grunt-contrib-jasmine');

    grunt.registerTask('test', ['jasmine']);
};