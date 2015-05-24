angular.module('processModule', ['taskModule', 'coreApp'])

    .factory('processRest', function ($log, coreApp, $resource) {
        var restProcessUrl = coreApp.getRestUrl() + 'processes/';
        var restOperationUrl = coreApp.getRestUrl() + 'operation/';
        var rawInterceptor = coreApp.getRawInterceptor();

        return $resource(restProcessUrl + 'process/:processId', {}, {
                getTree: {url: '/rest/console/tree/process/:processId/:startTaskId', params: {}},
                //list
                query: {url: restProcessUrl + 'search', params: {}},
                queryDefault: {url: restProcessUrl, params: {}},
                //actions
                create: {url: restOperationUrl + 'process/create', method: 'PUT', params: {}, interceptor:rawInterceptor},
                recovery:  {url: restOperationUrl + 'recovery/add',method: 'POST', interceptor:rawInterceptor},
                clone: {url: restOperationUrl + 'process/clone', method: 'POST', interceptor:rawInterceptor},
                abort: {url: restOperationUrl + 'process/abort',method: 'POST', interceptor:rawInterceptor},
                //dictionaries
                dictionaryStatus: {url: '/scripts/process/status.json', params: {}, isArray: true}
            }
        )
    })

    .filter('processStatus', function (processRest,coreApp) {
        var statuses = processRest.dictionaryStatus();
        return function (id,field) {
            return coreApp.findDictionary(statuses,id,field);
        };
    })

    .controller('processListController', function ($log, $scope, processRest, coreApp, $state, $stateParams) {

        $scope.processParams = angular.copy($stateParams);
        $log.info('processListController',$scope.processParams);

        function getRest(params) {
            return (params.processId || params.customId) ? processRest.query : processRest.queryDefault;
        }

        //Updates processes by polling REST resource
        function loadModel() {
            $log.info('loadModel', $scope.processParams);
            $scope.processesPage = getRest($scope.processParams)($scope.processParams,
                function success(value) {
                    $log.info('processListController: successfully updated processes page');
                    $scope.processesPageLoaded = value;
                    $scope.processesPageLoaded.$startIndex = coreApp.getStartIndex(value);
                    coreApp.refreshRate($scope.processParams, loadModel);
                }, function error(reason) {
                    coreApp.error('Processes page update failed',reason);
                });
        }

        //Initialization:
        $scope.statuses = processRest.dictionaryStatus({},function success(){
            loadModel();
        });

        //Update command:
        $scope.update = function () {
            $state.go('processes', angular.copy($scope.processParams), {replace: true, inherit: false, reload: true});
        };

        //Finalization:
        $scope.$on('$destroy', function(){
            coreApp.stopRefreshRate();
        });

        //Actions
        $scope.recovery = function (process) {
            coreApp.openConfirmModal('Process will be sent to recovery service.',
                function confirmed() {
                    processRest.recovery(process.processId, function success (value) {
                        log.log('Process recovered', value);
                        process.$recoverySubmited = true;
                        $scope.update();
                    }, function error(reason) {
                        coreApp.error('Processes recovery error',reason);
                    });
                });
        };

        $scope.abort = function (process) {
            coreApp.openConfirmModal('Current process, it\'s graph, all tasks and decisions will be deleted.',
                function confirmed() {
                    processRest.abort(process.processId, function success(value) {
                        $log.log('Process abort success', value);
                        $scope.update();
                    }, function error(reason) {
                        coreApp.error('Process abort error',reason);
                    });
                });
        };

    })

    .controller('processCardController', function ($log, $scope, processRest, coreApp, coreTree, $state, $stateParams) {
        $scope.processParams = angular.copy($stateParams);
        $log.info('processCardController',$scope.processParams);

        function loadModel() {
            $scope.process = processRest.get($scope.processParams,
                function success(value) {
                    if(value.processId) {
                        $log.info('processCardController: successfully updated process content');
                    }else{
                        coreApp.warn('Process not found by id',$scope.processParams.processId);
                    }
                    //@todo bug not work $scope.processParams.startTaskId = $scope.process.startTaskUuid;
                    $scope.processParams.startTaskId = 'undefined';
                    loadTreeModel();
                }, function error(reason) {
                    coreApp.error('Process update failed',reason);
                });

        }

        function loadTreeModel() {
            $scope.taskTree = processRest.getTree($scope.processParams,
                function success(value) {
                    $log.info('processCardController: successfully updated process tree');
                },
                function error(reason) {
                    coreApp.error('Process tree update failed',reason);
                });
        }

        //Initialization:
        loadModel();

        //Actions
        $scope.recovery = function (process) {
            coreApp.openConfirmModal('Process will be sent to recovery service.').result.then(
                function confirmed() {
                    processRest.recovery(process.processId,
                        function success (value) {
                            $log.log('Process recovered', value);
                            loadModel();
                        }, function error(reason) {
                             coreApp.error('Process recovery error',reason);
                        });
                });
        };

        $scope.clone = function (process) {
            coreApp.openConfirmModal('A new process with the same start task arguments would be created.').result.then(
                function confirmed() {
                    processRest.clone(process.processId,
                        function success(value) {
                            $log.log('Process clone success', value);
                            $state.go('process', {processId: value});
                        }, function error(reason) {
                            coreApp.error('Process clone error',reason);
                        });
                });
        };

    })

    .controller('processCreateController', function ($scope, $log, coreApp, processRest, $stateParams, $state) {

        $scope.task = angular.copy($stateParams);
        $log.info('processCreateController',$scope.task);
        $scope.types = ['DECIDER_START'];

        $scope.isValidForm = function() {
            return $scope.task.actorId && $scope.task.method;
        };

        //actions
        $scope.save = function(){
            $log.log('Try to create process with params', $scope.task);
            processRest.create($scope.task,
                function success(value) {
                    $log.log('Process create success', value);
                    $state.go('process', {processId: value});
                }, function error(reason) {
                    coreApp.error('Process create error',reason);
                });
        };

    });
