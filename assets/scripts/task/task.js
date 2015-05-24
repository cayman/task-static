angular.module('taskModule', ['coreApp'])

    .factory('taskRest', function ($log, coreApp, $resource) {
        var restTaskUrl = coreApp.getRestUrl() + 'tasks/';
        return $resource(restTaskUrl + 'task', {}, {
                getDecision: {url: restTaskUrl + 'decision/:processId/:taskId', params: {}},
                getTree: {url: coreApp.getRestUrl() + 'tree/task/:processId/:taskId', params: {}},
                //list
                query: {url: restTaskUrl + 'search', params: {}, isArray: true},
                queryDefault: {url: restTaskUrl, params: {}},
                queryRepeated: {url: coreApp.getRestUrl() + 'repeatedTasks/', params: {}, isArray: true},
                //dictionaries
                dictionaryStatus: {url: '/scripts/task/status.json', params: {}, isArray: true}

            }
        )
    })

    .filter('taskStatus', function (taskRest, coreApp) {
        var statuses = taskRest.dictionaryStatus();
        return function (id, field) {
            return coreApp.findDictionary(statuses, id, field);
        };
    })

    .directive('taskTreeTable', function ($log, coreTree) {
        return {
            restrict: 'A',
            transclude: false,
            scope: {
                taskTreeTable: '=',
                processTask: '='
            },
            templateUrl: '/views/task/tree-table.html',
            replace: false,
            link: function (scope, element, attrs) {
                scope.taskTreeItems = null;
                scope.$watch('taskTreeTable', function (value) {
                    if (value && value.$resolved) {
                        scope.taskTreeItems = coreTree.getFlatArray([value], 'children');
                    }
                }, true)

            }
        };
    })

    .directive('taskForm', function ($log, coreApp) {
        return {
            restrict: 'A',//Element, Class, Attribute
            terminal: true,
            scope: {
                task: "=taskForm",
                types: "=taskTypes"
            },
            controller: function ($scope, $element, $attrs) {
                //  $scope.types = ['DECIDER_START'];

                $scope.argTypes = coreApp.getArgTypes();

                $scope.addArgument = function () {
                    if (!$scope.task.args) {
                        $scope.task.args = [];
                    }
                    $scope.task.args.push({type: $scope.argTypes[0], value: ''});
                };

                $scope.removeArgument = function (idx) {
                    if ($scope.task.args && $scope.task.args.length > 0) {
                        $scope.task.args.splice(idx, 1);
                    }
                };
            },
            templateUrl: "/views/task/form.html",
            replace: true
        };
    })

    .controller('taskListController', function ($log, $scope, taskRest, coreApp, coreTree, $state, $stateParams, $timeout) {

        $scope.taskParams = angular.copy($stateParams);
        $log.info('taskListController', $scope.taskParams);

        function getRest(params) {
            return params.iterationCount ? taskRest.queryRepeated :
                ((params.taskId || params.processId) ? taskRest.query : taskRest.queryDefault );
        }

        //Updates tasks  by polling REST resource
        function loadModel() {
            $log.info('load tasks params:', $scope.taskParams);
            $scope.tasksPage = getRest($scope.taskParams)($scope.taskParams,
                function success(value) {
                    $log.info('taskListController: successfully updated tasks page');
                    $scope.tasksPageLoaded = value;
                    $scope.tasksPageLoaded.$startIndex = coreApp.getStartIndex(value);
                    //@todo REST must return paginated object (not array)
                    $scope.tasksPageLoadedItems = angular.isArray(value) ? value : value.items;
                    coreApp.refreshRate($scope.taskParams, loadModel, $scope);
                }, function error(reason) {
                    $log.error('Tasks page update failed', reason);
                });
        }

        //Initialization:
        loadModel();

        //Update command:
        $scope.update = function () {
            $state.go('tasks', angular.copy($scope.taskParams), {replace: true, inherit: false, reload: true});
        };

        //Finalization:
        $scope.$on('$destroy', function () {
            coreApp.stopRefreshRate();
        });

        //Actions
        $scope.showArgs = function (task) {
            coreApp.openPropertiesModal(task.args, task.taskId);
        }

    })
    .controller('taskCardController', function ($log, $scope, taskRest, coreApp, $state, $stateParams) {

        $scope.taskParams = angular.copy($stateParams);

        //Updates tasks  by polling REST resource
        function loadModel() {

            $log.info('loadModel', $scope.taskParams);

            $scope.task = taskRest.get($scope.taskParams,
                function success(value) {
                    if(value.taskId) {
                        $log.info('taskCardController: successfully updated task page');
                    }else{
                        coreApp.warn('Task not found by id',$scope.taskParams.taskId);
                    }
                }, function error(reason) {
                    coreApp.error('Task page update failed', reason);
                });

            $scope.taskDecision = taskRest.getDecision($scope.taskParams,
                function success(value) {
                    $log.info('taskCardController: successfully updated task page');
                }, function error(reason) {
                    coreApp.error('Tasks decision update failed', reason);
                });

            $scope.taskTree = taskRest.getTree($scope.taskParams,
                function success(value) {
                    $log.info('taskCardController: successfully updated task page');
                }, function error(reason) {
                    coreApp.error('Task tree update failed', reason);
                });
        }

        //Initialization:
        loadModel();

    });
