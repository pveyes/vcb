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
					[ 'src/js/libs/*.js',
					  'src/js/dataChannel.js',
					  'src/js/chat.js',
					  'src/js/presentation.js',
					  'src/js/recorder.js',
					  'src/js/stream.js',
					  'src/js/webrtc.js',
					  'src/js/stun.js',
					  'src/js/helper.js',
					  'src/js/dashboard.js',
  					  'src/js/eventListener.js',
					  'src/js/main.js' ]
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