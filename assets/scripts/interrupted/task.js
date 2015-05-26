angular.module('interruptedModule', ['taskModule', 'coreApp'])

    .factory('interruptedRest', function ($log, coreApp, $resource) {
        var restTaskUrl = coreApp.getRestUrl() + 'process/tasks/interrupted/';

        return $resource(restTaskUrl + 'task', {}, {
                //list
                query: {url: restTaskUrl + ':query', params: {}, isArray: true},
                //actions
                restart: {url: restTaskUrl + 'restart', params: {}},
                //dictionaries
                dictionaryGroup: {url: '/scripts/interrupted/groups.json', params: {}, isArray: true, cache: true}

            }
        );
    })

    .controller('interruptedController', function ($log, $scope, interruptedRest, coreApp, $state, $stateParams) {
        $log.info('interruptedController', $stateParams);

        function parseDate(date, withTime, rest) {
            return (angular.isDate(date) ? moment(date) : moment(date, moment.ISO_8601))
                .format((rest ? 'DD.MM.YYYY' : 'YYYY-MM-DD') + (withTime ? (rest ? ' HH:mm' : 'THH:mm') : ''));
        }

        function loadModel(params) {
            $log.info('loadModel', $scope.loadParams = params);

            //mark selected filter or group
            params.query = $state.is('interrupted')? 'group':'list';
            params.dateFrom = parseDate(params.dateFrom, params.withTime, true);
            params.dateTo = parseDate(params.dateTo, params.withTime, true);
            delete params.withTime;

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
        $scope.$stateParams = $stateParams;
        $scope.formParams = angular.copy($stateParams);

        interruptedRest.dictionaryGroup({}, function success(groups) {
            $scope.groups = coreApp.toObject(groups);
            $scope.groups.starter.selected = $stateParams.starterId || $stateParams.group === 'starter';
            $scope.groups.actor.selected = $stateParams.actorId || $stateParams.group === 'actor';
            $scope.groups.exception.selected = $stateParams.exception || $stateParams.group === 'exception';

            loadModel(angular.copy($scope.formParams));

            $scope.joinFilterParam = function (params, value) {
                var param = $scope.groups[$scope.loadParams.group].param;
                params[param] = value;
                return params;
            };

        });

        //Submit form command:
        $scope.search = function () {
            var params = angular.copy($scope.formParams);
            params.dateFrom = parseDate(params.dateFrom, params.withTime);
            params.dateTo = parseDate(params.dateTo, params.withTime);
            $log.warn('search', $scope.formParams, params);
            $state.go($state.current, params ,
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
