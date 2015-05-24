angular.module('scheduleModule', ['taskModule', 'coreApp'])

    .factory('scheduleRest', function ($log, coreApp, $resource) {
        var restScheduleUrl = coreApp.getRestUrl() + 'schedule/';
        var rawInterceptor = coreApp.getRawInterceptor();
        return $resource(restScheduleUrl + 'card', {}, {
                getNodeCount: {url: restScheduleUrl + 'node_count', interceptor: rawInterceptor},
                //list
                query: {url: restScheduleUrl + 'list', params: {}, isArray: true},
                //actions
                create: {url: restScheduleUrl + 'schedule/create', method: 'PUT', params: {}},
                update: {url: restScheduleUrl + 'schedule/update?jobId=:id', method: 'PUT', params: {}},

                validate: {url: restScheduleUrl + 'validate/cron', interceptor: rawInterceptor},
                activate: {url: restScheduleUrl + 'action/activate/', method: 'POST', params: {}},
                deactivate: {url: restScheduleUrl + 'action/deactivate/', method: 'POST', params: {}},
                delete: {url: restScheduleUrl + 'action/delete/', method: 'POST', params: {}},
                //dictionaries
                dictionaryStatus: {url: '/scripts/schedule/status.json', params: {}, isArray: true}
            }
        )
    })

    .filter('scheduleStatus', function (scheduleRest, coreApp) {
        var statuses = scheduleRest.dictionaryStatus();
        return function (id) {
            return coreApp.findDictionary(statuses, id, 'name', 'Undefined status');
        };
    })

    .filter('scheduleClass', function (scheduleRest, coreApp) {
        var statuses = scheduleRest.dictionaryStatus();
        return function (id) {
            return coreApp.findDictionary(statuses, id, 'style', 'warning');
        };
    })

    .controller('scheduleListController', function ($log, $scope, scheduleRest,coreRest, coreApp, $state, $stateParams, $timeout) {

        $scope.scheduleParams = angular.copy($stateParams);
        $log.info('scheduleListController', $scope.scheduleParams);

        //Updates schedules  by polling REST resource
        function loadModel() {
            $log.info('load schedules params:', $scope.scheduleParams);

            $scope.schedulesPage = scheduleRest.query($scope.scheduleParams,
                function success(value) {
                    $log.info('scheduleListController: successfully updated schedules page');
                    $scope.schedulesPageLoaded = value;
                    $scope.schedulesPageLoaded.$startIndex = coreApp.getStartIndex(value);
                    //@todo REST must return paginated object (not array)
                    $scope.schedulesPageLoadedItems = angular.isArray(value) ? value : value.items;
                    coreApp.refreshRate($scope.scheduleParams, loadModel);
                }, function error(reason) {
                    coreApp.error('Schedules page update failed',reason);
                });

            scheduleRest.getNodeCount({} ,
                function success(value) {
                    $scope.total = value;
                }, function error(reason) {
                    coreApp.error('Cannot get node count',reason);
                });

            coreRest.getTime({} ,
                function success(value) {
                    $scope.serverTime = value;
                }, function error(reason) {
                    coreApp.error('Cannot update server time',reason);
                });
        }

        //Initialization:
        loadModel();

        //Update command:
        $scope.update = function () {
            $state.go('schedules', angular.copy($scope.scheduleParams), {
                replace: true,
                inherit: false,
                reload: true
            });
        };

        //Finalization:
        $scope.$on('$destroy', function () {
            coreApp.stopRefreshRate();
        });

        //Actions
        $scope.activate = function (schedule) {
            scheduleRest.activate({id: schedule.job.id},
                function success(value) {
                    $log.log('scheduleListController: schedule activated', value);
                    loadModel();
                }, function error(reason) {
                    coreApp.error('Schedule activate failed',reason);
                });
        };

        $scope.deactivate = function (schedule) {
            scheduleRest.deactivate({id: schedule.job.id},
                function success(value) {
                    $log.log('scheduleListController: schedule deactivated', value);
                    loadModel();
                }, function error(reason) {
                    coreApp.error('Schedule deactivate failed',reason);
                });
        };

        $scope.delete = function (schedule) {
            coreApp.openConfirmModal('Current schedule, will be deleted',
                function confirmed() {
                    scheduleRest.delete({id: schedule.job.id},
                        function success(value) {
                            $log.log('scheduleListController: schedule removed', value);
                            loadModel();
                        }, function error(reason) {
                            coreApp.error('Schedule removal failed',reason);
                        });
                });
        };

        $scope.showError = function (message) {
            coreApp.openStacktraceModal(message, 'Error');
        };

    })

    .controller('scheduleCardController', function ($log, $scope, scheduleRest, coreApp, $state, $stateParams) {

        $log.info('scheduleCardController', $stateParams);
        $scope.types = ['WORKER_SCHEDULED', 'DECIDER_START'];

        //Updates schedules  by polling REST resource
        function loadModel() {
            $log.info('loadModel', $stateParams.id);
            $scope.job = $stateParams.id ?
                scheduleRest.get($stateParams,
                    function success(value) {
                        $log.info('scheduleCardController: successfully updated schedule page');
                        $scope.changeCron();
                    }, function error(reason) {
                        coreApp.error('Schedule page update failed',reason);
                    }) : new scheduleRest();
        }

        //Initialization:
        loadModel();

        $scope.isValidForm = function () {
            return $scope.job.name && $scope.job.isCronValid &&
                $scope.job.task.method && $scope.job.task.actorId &&
                $scope.job.queueLimit >= 0 && $scope.job.maxErrors >= 0;
        };

        //Actions
        $scope.save = function () {
            var saveRest = $scope.job.id ? scheduleRest.update : scheduleRest.create;
            saveRest($scope.job,
                function success(value) {
                    $log.log('scheduleCardController: schedule save success', value);
                    $state.go('schedule', {});
                }, function error(reason) {
                    coreApp.error('Schedule save error',reason);
                });
        };

        $scope.changeCron = function () {
            if ($scope.job.cron) {
                scheduleRest.validate({value: $scope.job.cron},
                    function success(value) {
                        $log.info('scheduleCardController: successfully cron validate', value);
                        $scope.job.isCronValid = !(value.length > 0);
                    }, function error(reason) {
                        coreApp.error('Schedule cron validate failed',reason);
                    });
            } else {
                delete $scope.job.isCronValid;
            }
        };

    });
