angular.module('indexApp', ['coreApp',
    'homeModule', 'queueModule', 'actorModule','taskModule',
     'processModule','scheduleModule','interruptedModule'])

    .config(function ($stateProvider, $urlRouterProvider, coreAppProvider) {
        console.log('indexApp.config');

        coreAppProvider.setRestUrl('/rest/console/');
        coreAppProvider.setPageSize([5, 10, 30, 50, 100]);
        coreAppProvider.setRefreshRates([0, 2, 5, 10, 30, 50]);

        //Dialog configs
        coreAppProvider.setDialogConfirmConfig({
            templateUrl: '/views/core/dialog-confirm.html',
            windowClass: 'approve',
            controller: 'ModalDialogController'
        });

        coreAppProvider.setDialogStacktraceConfig({
            templateUrl: '/views/core/dialog-stacktrace.html',
            windowClass: 'stack-trace',
            controller: 'ModalDialogController'
        });

        coreAppProvider.setDialogPropertiesConfig({
            templateUrl: '/views/core/dialog-properties.html',
            windowClass: 'modal-huge',
            controller: 'ModalDialogController'
        });

        //Home page configs
        $stateProvider.state('home', {
            url: '/home',
            views: {
                'navigation': {
                    templateUrl: '/views/navigation.html'
                },
                '': {
                    templateUrl: '/views/home/home.html',
                    controller: /*@ngInject*/ 'homeController'
                },
                'footer': {
                    templateUrl: '/views/footer.html'
                }
            }
        });

        //Queues pages configs
        $stateProvider.state('queues', {
            url: '/queues?{filter}&{periodSize:int}&{balancePeriod}&{pageNum:int}&{pageSize:int}&{refreshRate:int}', // root route
            params: {balancePeriod: 'hour', pageNum: 1, pageSize: 5, refreshRate: 0, periodSize: 0},
            views: {
                'navigation': {
                    templateUrl: '/views/navigation.html'
                },
                '': {
                    templateUrl: '/views/queue/list.html',
                    controller: /*@ngInject*/ 'queueListController'
                },
                'footer': {
                    templateUrl: '/views/footer.html'
                }
        }
        });

        $stateProvider.state('queue', {
            url: '/queues/:queueName/card?{pageNum:int}&{pageSize:int}&{refreshRate:int}', // root route
            params: {pageNum: 1, pageSize: 5, refreshRate: 0},
            views: {
                'navigation': {
                    templateUrl: '/views/navigation.html'
                },
                '': {
                    templateUrl: '/views/queue/card.html',
                    controller: /*@ngInject*/ 'queueCardController'
                },
                'footer': {
                    templateUrl: '/views/footer.html'
                }
            }
        });

        //Actors pages configs
        $stateProvider.state('actors', {
            url: '/actors?{filter}&{pageNum:int}&{pageSize:int}&{refreshRate:int}&{metrics}', // root route
            params: {pageNum: 1, pageSize: 5, refreshRate: 0},
            views: {
                'navigation': {
                    templateUrl: '/views/navigation.html'
                },
                '': {
                    templateUrl: '/views/actor/list.html',
                    controller: /*@ngInject*/ 'actorListController'
                },
                'footer': {
                    templateUrl: '/views/footer.html'
                }
            }
        });

        //Tasks pages configs
        $stateProvider.state('tasks', {
            url: '/tasks?{taskId}&{processId}&{iterationCount:int}&{pageNum:int}&{pageSize:int}&{refreshRate:int}',
            params: {pageNum: 1, pageSize: 10, refreshRate: 0, iterationCount:0},
            views: {
                'navigation': {
                    templateUrl: '/views/navigation.html'
                },
                '': {
                    templateUrl: '/views/task/list.html',
                    controller: /*@ngInject*/ 'taskListController'
                },
                'footer': {
                    templateUrl: '/views/footer.html'
                }
            }
        });

        $stateProvider.state('task', {
            url: '/tasks/:taskId/card?{processId}',
            params: {},
            views: {
                'navigation': {
                    templateUrl: '/views/navigation.html'
                },
                '': {
                    templateUrl: '/views/task/card.html',
                    controller: /*@ngInject*/ 'taskCardController'
                },
                'footer': {
                    templateUrl: '/views/footer.html'
                }
            }
        });

        var interruptedParams = {
            group: 'starter', refreshRate: 0,
            dateFrom: moment().subtract(1, 'days').format('YYYY-MM-DD'),
            dateTo: moment().format('YYYY-MM-DD')
        };

        //Interrupted tasks pages configs
        $stateProvider.state('interrupted', {
            url: '/interrupted?{group}&{starterId}&{actorId}&{exception}&{dateFrom}&{dateTo}&{withTime}&{refreshRate:int}',
            params: interruptedParams,
            views: {
                'navigation': {
                    templateUrl: '/views/navigation.html'
                },
                '': {
                    templateUrl: '/views/interrupted/group.html',
                    controller: /*@ngInject*/ 'interruptedController'
                },
                'footer': {
                    templateUrl: '/views/footer.html'
                }
            }
        });

        $stateProvider.state('interrupted_list', {
            url: '/interrupted/list?{group}&{starterId}&{actorId}&{exception}&{dateFrom}&{dateTo}&{withTime}&{refreshRate:int}',
            params: interruptedParams,
            views: {
                'navigation': {
                    templateUrl: '/views/navigation.html'
                },
                '': {
                    templateUrl: '/views/interrupted/list.html',
                    controller: /*@ngInject*/ 'interruptedController'
                },
                'footer': {
                    templateUrl: '/views/footer.html'
                }
            }
        });

        //Processes pages configs
        $stateProvider.state('processes', {
            url: '/processes?{processId}&{customId}&{status}&{type}&{pageNum:int}&{pageSize:int}&{refreshRate:int}',
            params: {pageNum: 1, pageSize: 5, refreshRate: 0},
            views: {
                'navigation': {
                    templateUrl: '/views/navigation.html'
                },
                '': {
                    templateUrl: '/views/process/list.html',
                    controller: /*@ngInject*/ 'processListController'
                },
                'footer': {
                    templateUrl: '/views/footer.html'
                }
            }
        });

        $stateProvider.state('process', {
            url: '/processes/:processId/card',
            params: {},
            views: {
                'navigation': {
                    templateUrl: '/views/navigation.html'
                },
                '': {
                    templateUrl: '/views/process/card.html',
                    controller: /*@ngInject*/ 'processCardController'
                },
                'footer': {
                    templateUrl: '/views/footer.html'
                }
            }
        });

        $stateProvider.state('process_create', {
            url: '/processes/create',
            params: {},
            views: {
                'navigation': {
                    templateUrl: '/views/navigation.html'
                },
                '': {
                    templateUrl: '/views/process/create.html',
                    controller: /*@ngInject*/ 'processCreateController'
                },
                'footer': {
                    templateUrl: '/views/footer.html'
                }
            }
        });

        //Schedules pages configs
        $stateProvider.state('schedules', {
            url: '/schedules?{pageNum:int}&{pageSize:int}&{refreshRate:int}',
            params: {pageNum: 1, pageSize: 10, refreshRate: 0},
            views: {
                'navigation': {
                    templateUrl: '/views/navigation.html'
                },
                '': {
                    templateUrl: '/views/schedule/list.html',
                    controller: /*@ngInject*/ 'scheduleListController'
                },
                'footer': {
                    templateUrl: '/views/footer.html'
                }
            }
        });

        $stateProvider.state('schedule', {
            url: '/schedules/:id/card',
            params: {},
            views: {
                'navigation': {
                    templateUrl: '/views/navigation.html'
                },
                '': {
                    templateUrl: '/views/schedule/card.html',
                    controller: /*@ngInject*/ 'scheduleCardController'
                },
                'footer': {
                    templateUrl: '/views/footer.html'
                }
            }
        });

        $stateProvider.state('schedule_create', {
            url: '/schedule/create',
            params: {},
            views: {
                'navigation': {
                    templateUrl: '/views/navigation.html'
                },
                '': {
                    templateUrl: '/views/schedule/card.html',
                    controller: /*@ngInject*/ 'scheduleCardController'
                },
                'footer': {
                    templateUrl: '/views/footer.html'
                }
            }
        });

        $urlRouterProvider.otherwise('/home');
    })

    .run(function ($rootScope) {
        $rootScope.dateTimeFormat = 'dd-MM-yyyy HH:mm:ss';
        $rootScope.timeFormat = 'HH:mm:ss';
        $rootScope.dateFormat = 'dd-MM-yyyy';
    });

