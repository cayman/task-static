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
        $log.info('actorListController',$stateParams);

        function loadModel(params) {
            $log.info('loadModel', $scope.loadParams = params);
            $scope.tempActorsModel = actorRest.query(params,
                function success(value) {
                    $scope.actorsModel  =  coreApp.parseListModel(value); //cause array or object
                    if($scope.actorsModel){
                        $log.info('Successfully updated actors page');
                        loadMetrics(params.metrics,value);
                    }else{
                        coreApp.info('Actors not found',reason);
                    }
                    coreApp.refreshRate(params, loadModel);
                }, function error(reason) {
                    coreApp.error('Actors page update failed',reason);
                });
        }

        function loadMetrics(metrics,actorsModel) {
            var params = {
                //get seted array of metric names
                metrics: _.reduce(metrics, function(keys, value, key ) {
                    return value ? keys.concat(key) : keys;
                }, [])
            };
            if(params.metrics.length > 0){
                params.actorIds = _.map(actorsModel.items, function (item) {
                    return item.id;
                });
                $log.info('actorListController: load metric data');
                $scope.tempMetricsModel = actorRest.loadMetrics(params,
                    function success(value) {
                        $log.info('actorListController: successfully updated metrics page');
                        $scope.metricsModel = value;
                    }, function error(reason) {
                        coreApp.error('Metrics for actors update failed',reason);
                        $scope.metricsModel = null;
                    });
            }
        }

        //Initialization:
        $scope.formParams = angular.copy($stateParams);
        $scope.formParams.metrics = $scope.formParams.metrics ?
            JSON.parse($scope.formParams.metrics) : {};

        $scope.metrics = actorRest.dictionaryMetrics({},
            function success(value) {
                $log.log('Loaded metrics dictionary', value);
                loadModel(angular.copy($scope.formParams));
            }, function error(reason) {
                coreApp.error('Metrics update failed', reason);
            });

        //Update command:
        $scope.search = function () {
            var params = angular.copy($scope.formParams);
            Object.keys(params.metrics).forEach(function(k) {
                if (!params.metrics[k]) {
                    delete params.metrics[k];
                }
            });
            params.metrics = JSON.stringify(params.metrics);
            $state.go('actors', params, {replace: true, inherit: false, reload: true});
        };

        //Finalization:
        $scope.$on('$destroy', function(){
            coreApp.stopRefreshRate();
        });

        //Actions
        $scope.unblock = function (actor) {
            coreApp.openConfirmModal('Actor will be set to unblock.',
                function confirmed() {
                    actorRest.unblock(actor.id,function success() {
                        $log.log('Actor ['+actor.id+'] have been set to unblocked');
                        loadModel($scope.loadParams);
                    }, function error(reason) {
                        coreApp.error('Error setting unblocked for actor ['+actor.id+']',reason);
                    });
                });
        };

        $scope.block = function (actor) {
            coreApp.openConfirmModal('Actor will be set to block.',
                function confirmed() {
                    actorRest.block(actor.id,function success() {
                        $log.log('Actor ['+actor.id+'] have been set to blocked');
                        loadModel($scope.loadParams);
                    }, function error(reason) {
                        coreApp.error('Error setting blocked for actor ['+actor.id+']',reason);
                    });
                });
        };

    });
