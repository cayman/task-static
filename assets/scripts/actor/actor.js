angular.module('actorModule', ['coreApp'])

    .factory('actorRest', function ($log, coreApp, $resource) {
        var restActorUrl = coreApp.getRestUrl() + 'actor/';

        return $resource(restActorUrl, {}, {
                //list
                query: {url: restActorUrl + 'list/', params: {}},
                loadMetrics: {url: restActorUrl + 'metrics/compare', method: 'POST', params: {}},
                //actions
                unblock: {url: restActorUrl + 'unblock/',  method: 'POST'},
                block: {url: restActorUrl + 'block/', method: 'POST'},
                //dictionaries
                dictionaryMetrics: {url: restActorUrl + 'metrics/compare', params: {}, isArray: true}
             });
    })

    .controller('actorListController', function ($log, $scope, actorRest, coreApp, $state, $stateParams, $timeout) {

        $scope.actorParams = angular.copy($stateParams);
        $log.info('actorListController',$scope.actorParams);

        //Updates test  by polling REST resource
        function loadModel() {
            $log.info('loadModel', $scope.actorParams);
            $scope.actorsPage = actorRest.query($scope.actorParams,
                function success(value) {
                    $log.info('actorListController: successfully updated actors page',value);
                    $scope.actorsPageLoaded = value;
                    $scope.actorsPageLoaded.$startIndex = coreApp.getStartIndex(value);
                    loadMetrics();
                    coreApp.refreshRate($scope.actorParams, loadModel);
                }, function error(reason) {
                    coreApp.error('Actors page update failed',reason);
                });
        }

        function loadMetrics() {
            var metricNames = coreApp.getKeysArray($scope.metricOptions);
            if(metricNames.length > 0 && $scope.actorsPageLoaded.items.length > 0){
                $log.info('actorListController: load metric data');
                $scope.metricsPage = actorRest.loadMetrics({ metrics: metricNames,
                        actorIds: coreApp.getIdValueArray($scope.actorsPageLoaded.items)},
                    function success(value) {
                        $log.info('actorListController: successfully updated metrics page');
                        $scope.metricsPageLoaded = value;
                    }, function error(reason) {
                        coreApp.error('Metrics for actors update failed',reason);
                    });
            }
        }

        //Initialization: after load metrics dictionary
        $scope.metrics = actorRest.dictionaryMetrics({},function success(value) {
            $log.log('Loaded metrics',$scope.metrics);
            loadModel();
        });
        //Initialization: get selected metrics from url param 'metrics'
        $scope.metricOptions = $scope.actorParams.metrics ? JSON.parse($scope.actorParams.metrics) : {};

        $scope.$watch('metricOptions',function(newValue, oldValue){
            if(newValue && newValue!=oldValue){
                $log.info('metrics',newValue);
                //change url param 'metrics'
                $scope.actorParams.metrics = JSON.stringify(newValue);
                if($scope.actorsPage.$resolved){
                    loadMetrics();
                }
            }
        },true);

        //Update command:
        $scope.update = function () {
            $state.go('actors', angular.copy($scope.actorParams), {replace: true, inherit: false, reload: true});
        };

        //Finalization:
        $scope.$on('$destroy', function(){
            coreApp.stopRefreshRate();
        });

        //Actions
        $scope.unblock = function (actor) {
            coreApp.openConfirmModal('Actor will be set to unblock.').result.then(
                function confirmed() {
                    actorRest.unblock(actor.id,function success() {
                        $log.log('Actor ['+actor.id+'] have been set to unblocked');
                        loadModel();
                    }, function error(reason) {
                        coreApp.error('Error setting unblocked for actor ['+actor.id+']',reason);
                       // $scope.update();
                    });
                });
        };

        $scope.block = function (actor) {
            coreApp.openConfirmModal('Actor will be set to block.').result.then(
                function confirmed() {
                    actorRest.block(actor.id,function success() {
                        $log.log('Actor ['+actor.id+'] have been set to blocked');
                        loadModel();
                    }, function error(reason) {
                        coreApp.error('Error setting blocked for actor ['+actor.id+']',reason);
                        // $scope.update();
                    });
                });
        };

    });
