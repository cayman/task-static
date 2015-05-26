angular.module('interruptedModule', ['taskModule', 'coreApp'])

    .factory('interruptedRest', function ($log, coreApp, interruptedUtil, $resource) {
        var restTaskUrl = coreApp.getRestUrl() + 'process/tasks/interrupted/';

        return $resource(restTaskUrl + 'task', {}, {
                //list
                query: {url: restTaskUrl + ':query', params: {}, isArray: true},
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
            return coreApp.findDictionary(groups, id, field || 'name');
        };
    })

    .factory('interruptedUtil', function ($log, coreApp, $filter) {
        return {
            parseDateRest: function (date, withTime) {
                return $filter('date')(date || new Date(), withTime ? 'dd.MM.yyyy HH.mm' : 'dd.MM.yyyy');
            },
            parseDate: function (date, withTime) {
                return $filter('date')(date || new Date(), withTime ? 'yyyy-MM-ddTHH.mm' : 'yyyy-MM-dd');
            }
        };
    })

    .controller('interruptedController', function ($log, $scope, interruptedRest, interruptedUtil, coreApp, $state, $stateParams) {
        $log.info('interruptedController', $stateParams);

        function loadModel(params) {
            $log.info('loadModel', $scope.loadParams = params);

            //mark selected filter or group
            params.query = $state.is('interrupted')? 'group':'list';
            params.dateFrom = interruptedUtil.parseDateRest(params.from,params.withTime);
            params.dateTo = interruptedUtil.parseDateRest(params.to,params.withTime);
            params.$starter = params.starterId || params.group === 'starter';
            params.$actor = params.actorId || params.group === 'actor';
            params.$exception = params.exception || params.group === 'exception';
            params.withTime = undefined;
            params.from = undefined;
            params.to = undefined;

            $scope.tempInterruptedModel = interruptedRest.query(params,
                function success(value) {
                    $scope.interruptedModel = coreApp.parseListModel(value);//cause array or object
                    if($scope.interruptedModel){
                        $log.info('Successfully updated interrupted tasks page');
                    }else{
                        coreApp.warn('Not found any interrupted tasks',value);
                    }
                    coreApp.refreshRate(params, loadModel);
                }, function error(reason) {
                    coreApp.error('Interrupted tasks page update failed',reason);
                });
        }

        //Initialization:
        $scope.formParams = angular.copy($stateParams);
        $scope.$stateParams = $stateParams;
        $scope.groups = interruptedRest.dictionaryGroup({}, function success(groups) {
            loadModel(angular.copy($scope.formParams));

            $scope.joinFilterParam = function (params, value) {
                var param = coreApp.findDictionary(groups, $scope.loadParams.group, 'param');
                params[param] = value;
                return params;
            };

        });

        //Submit form command:
        $scope.search = function () {
            var param = angular.copy($scope.formParams);
            param.from = interruptedUtil.parseDate(param.from, param.withTime);
            param.to = interruptedUtil.parseDate(param.to, param.withTime);
            $log.info('search', param);
            $state.go($state.current, param ,
                {replace: true, inherit: false, reload: true});
        };

        //Finalization:
        $scope.$on('$destroy', function () {
            coreApp.stopRefreshRate();
        });

        //Actions
        $scope.showStackTrace = function (message) {
            coreApp.openStacktraceModal(message, 'StackTrace');
        };

        $scope.restartGroup = function (group) {

        };

        $scope.restart = function (task) {

        };

    });
