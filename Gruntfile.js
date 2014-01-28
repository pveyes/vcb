'use strict';

module.exports = function(grunt) {

	grunt.initConfig({

		copy: {
			build: {
				cwd: 'src/fonts',
				src: [ '**' ],
				dest: 'app/public/fonts',
				expand: true,
			}
		},

		cssmin: {
			build: {
				files: {
					'app/public/style.min.css': [ 'src/css/*.css' ]
				}
			}
		},

		uglify: {
			build: {
				options: {
					mangle: false
				},
				files: {
					'app/public/script.min.js': 
					[ 'src/js/socket.io.js',
					  'src/js/jquery.js',
					  'src/js/NgisX.js',
					  'src/js/recorderWebM.js',
					  'src/js/dataChannel.js',
					  'src/js/chat.js',
					  'src/js/presentation.js',
					  'src/js/recorder.js',
					  'src/js/stream.js' ]
				}
			}
		}

	});

	// load plugin
	grunt.loadNpmTasks('grunt-contrib-copy');
	grunt.loadNpmTasks('grunt-contrib-cssmin');
	grunt.loadNpmTasks('grunt-contrib-uglify');

	// register task
	grunt.registerTask('build', ['copy', 'cssmin', 'uglify']);
}