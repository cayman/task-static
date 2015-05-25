module.exports = function (grunt) {

    require('grunt-timer').init(grunt);

    var taskConfig = {
        params: grunt.file.readYAML('Gruntparams.yml'),

        jshint: {
            options: {
                jshintrc: '.jshintrc'
            },
            portal: [
                'Gruntfile.js'
            ],
            js: [
                '<%=params.build %>/scripts/**/*.js'
            ]
        },

        //jsonlint: {
        //    app: {
        //        src: [ '<%=params.build %>/**/*.json' ]
        //    }
        //},

        connect: {
            server: {
                options: {
                    port: '<%= params.port %>',
                    hostname: '<%= params.hostname %>',
                    base: '<%= params.build %>/',
                    open: 'http://localhost:<%= params.port %>',
                    livereload: true,
                    middleware: function (connect, options) {
                        return [
                            require('grunt-connect-proxy/lib/utils').proxyRequest,
                            connect.static(options.base[0] || options.base),
                            connect.directory(options.base[0] || options.base)
                        ];
                    }
                },
                proxies: '<%= params.proxies %>'
            }
        },

        watch: {
            assets: {
                options: {
                    cwd: '<%= params.build %>',
                    livereload: true
                },
                files: [ '**/*.hbs', '**/*.html', '**/*.json', '**/*.js','**/*.yml','**/*.css'],
                tasks: ['jshint']
            }
        }

    };

    grunt.initConfig(taskConfig);
    require('matchdep').filterDev('grunt-*').forEach(grunt.loadNpmTasks);


    //Build portal, Run server connect with proxy and livereload
    grunt.registerTask('server', [
        //'jshint',
        'configureProxies:server',
        'connect:server',
        'watch:assets'
    ]);


};