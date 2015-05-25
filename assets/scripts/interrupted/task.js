angular.module('interruptedModule', ['taskModule', 'coreApp'])

    .factory('interruptedRest', function ($log, coreApp, interruptedUtil, $resource) {
        var restTaskUrl = coreApp.getRestUrl() + 'process/tasks/interrupted/';

        function dateFrom(){
            var from = this.from;
            this.from = undefined;
            return interruptedUtil.parseDateRest(from,this.withTime);
        }
        function dateTo(){
            var to = this.to;
            this.to = undefined;
            return interruptedUtil.parseDateRest(to,this.withTime);
        }
        return $resource(restTaskUrl + 'task', {}, {
                //list
                query: {url: restTaskUrl + 'list', params: {
                    dateFrom : dateFrom,
                    dateTo : dateTo
                }, isArray: true},
                queryGroup: {url: restTaskUrl + 'group', params: {
                    dateFrom : dateFrom,
                    dateTo : dateTo
                }, isArray: true},
                //actions
                restart: {url: restTaskUrl + 'restart', params: {}},
                //dictionaries
                dictionaryGroup: {url: '/scripts/interrupted/group.json', params: {}, isArray: true, cache: true}

            }
        );
    })
    .run(function ($rootScope, interruptedRest) {
        $rootScope.groupsDitionairy = interruptedRest.dictionaryGroup();

    })

    .filter('interruptedGroup', function ($log, $rootScope, interruptedRest, coreApp) {
        var groups = $rootScope.groupsDitionairy;
        return function (id, field) {
            $log.debug(id, field);
            return coreApp.findDictionary(groups, id, field || 'name');
        };
    })

    .factory('interruptedUtil', function ($log, coreApp, $filter) {
        return {
            parseDateRest: function (date, withTime) {
                return $filter('date')(date || new Date(), withTime ? 'dd.MM.yyyy HH.mm' : 'dd.MM.yyyy');
            },
            parseDate: function (date, withTime) {
                return $filter('date')(date || new Date(), withTime ? 'yyyy-MM-dd HH.mm.ss' : 'yyyy-MM-dd');
            }
        };
    })

    .controller('interruptedGroupController', function ($log, $scope, interruptedRest, interruptedUtil, coreApp, $state, $stateParams) {

        $scope.interruptedParams = angular.copy($stateParams);
        $log.info('interruptedGroupController', $scope.interruptedParams);


        //Updates interrupted tasks  by polling REST resource
        function loadModel() {
            $scope.interruptedParamsLoaded = angular.copy($scope.interruptedParams);

            //mark selected filter or group
            $scope.interruptedParamsLoaded.$starter = $scope.interruptedParamsLoaded.starterId || $scope.interruptedParamsLoaded.group === 'starter';
            $scope.interruptedParamsLoaded.$actor = $scope.interruptedParamsLoaded.actorId || $scope.interruptedParamsLoaded.group === 'actor';
            $scope.interruptedParamsLoaded.$exception = $scope.interruptedParamsLoaded.exception || $scope.interruptedParamsLoaded.group === 'exception';


            $log.info('load interrupted tasks params:', $scope.interruptedParams);
            $scope.interruptedPage = interruptedRest.queryGroup($scope.interruptedParams,
                function success(value) {
                    if(value.length > 0 ){
                        $log.info('successfully updated interrupted tasks page');
                    }else{
                        coreApp.warn('Not found any interrupted tasks');
                    }
                    $scope.interruptedPageLoaded = value;
                    $scope.interruptedPageLoaded.$startIndex = coreApp.getStartIndex(value);
                    //@todo REST must return paginated object (not array)
                    $scope.interruptedPageLoadedItems = angular.isArray(value) ? value : value.items;
                    coreApp.refreshRate($scope.interruptedParams, loadModel, $scope);
                }, function error(reason) {
                    coreApp.error('Interrupted tasks page update failed',reason);
                });
        }

        //Initialization:
        $scope.groups = interruptedRest.dictionaryGroup({}, function success(groups) {
            loadModel();


            $scope.joinFilterParam = function (params, value) {
                var param = coreApp.findDictionary(groups, $scope.interruptedParamsLoaded.group, 'param');
                params[param] = value;
                return params;
            };

        });


        //Update command:
        $scope.update = function () {
            var param = angular.copy($scope.interruptedParams);
            param.from = interruptedUtil.parseDate(param.from, param.withTime);
            param.to = interruptedUtil.parseDate(param.to, param.withTime);
            $log.info('update', param);
            $state.go('interrupted',param , {
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


    })
    .controller('interruptedListController', function ($log, $scope, $filter, interruptedUtil, interruptedRest, coreApp, $state, $stateParams, $timeout) {
        //Actions

        $scope.interruptedParams = angular.copy($stateParams);
        $log.info('interruptedListController', $scope.interruptedParams);


        //Updates interrupted tasks  by polling REST resource
        function loadModel() {
            $scope.interruptedParamsLoaded = angular.copy($scope.interruptedParams);

            $log.info('load interrupted tasks params:', $scope.interruptedParams);
            $scope.interruptedPage = interruptedRest.query($scope.interruptedParams,
                function success(value) {
                    if(value.length > 0 ){
                        $log.info('successfully updated interrupted tasks page');
                    }else{
                        coreApp.warn('Not found any interrupted tasks');
                    }
                    $scope.interruptedPageLoaded = value;
                    $scope.interruptedPageLoaded.$startIndex = coreApp.getStartIndex(value);
                    //@todo REST must return paginated object (not array)
                    $scope.interruptedPageLoadedItems = angular.isArray(value) ? value : value.items;
                    coreApp.refreshRate($scope.interruptedParams, loadModel, $scope);
                }, function error(reason) {
                    coreApp.error('Interrupted tasks page update failed',reason);
                });
        }

        //Initialization:
        $scope.groups = interruptedRest.dictionaryGroup({}, function success(groups) {
            loadModel();

        });


        //Update command:
        $scope.update = function () {
            var param = angular.copy($scope.interruptedParams);
            param.from = interruptedUtil.parseDate(param.from, param.withTime);
            param.to = interruptedUtil.parseDate(param.to, param.withTime);
            $log.info('update', param);
            $state.go('interrupted_list',param , {
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
        $scope.showStackTrace = function (message) {
            coreApp.openStacktraceModal(message, 'StackTrace');
        };

    });