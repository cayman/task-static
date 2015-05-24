angular.module('queueModule', ['coreApp'])

    .factory('queueRest', function ($log, coreApp, $resource) {
        var restQueueUrl = coreApp.getRestUrl() + 'queues/';
        var rawInterceptor = coreApp.getRawInterceptor();

        return $resource(coreApp.getRestUrl() + 'queue/:queueName', {}, {
                getSize: {url: restQueueUrl + ':name/size', interceptor:rawInterceptor},
                getStorageSize: {url: restQueueUrl + ':name/storage/size', interceptor:rawInterceptor},
                //list
                query: {url: restQueueUrl, params: {}},
                queryHovering: {url: coreApp.getRestUrl() + 'hoveringQueues/', params: {}, isArray: true},
                //actions
                clear: {url: restQueueUrl + 'clear', method: 'POST', interceptor:rawInterceptor},
                remove: {url: restQueueUrl + 'remove', method: 'POST', interceptor:rawInterceptor}

            }
        )
    })

    .controller('queueListController', function ($log, $scope, queueRest, coreApp, $state, $stateParams, $timeout) {

        $scope.queueParams = angular.copy($stateParams);
        $log.info('queueListController',$scope.queueParams);

        function getRest(params) {
            // 'hoveringQueues/' or 'queues/'
            return params.periodSize ? queueRest.queryHovering : queueRest.query;
        }

        //Updates queues  by polling REST resource
        function loadModel() {
            $log.info('loadModel', $scope.queueParams);

            $scope.queuesPage = getRest($scope.queueParams)($scope.queueParams,
                function success(value) {
                    $log.info('queueListController: successfully updated queues page');
                    $scope.queuesPageLoaded = value;
                    $scope.queuesPageLoaded.$startIndex = coreApp.getStartIndex(value);
                    $scope.queuesPageLoaded.$totalTasks = coreApp.getTotalCount(value);
                    //@todo REST must return paginated object (not array)
                    $scope.queuesPageLoadedItems = angular.isArray(value) ? value : value.items;
                    coreApp.refreshRate($scope.queueParams, loadModel);
                }, function error(reason) {
                    coreApp.error('Queues page update failed',reason);
                });
        }

        //Initialization:
        loadModel();

        //Update command:
        $scope.update = function () {
            var params = angular.copy($scope.queueParams);
            $log.info('update', params);
            $state.go('queues', params, {replace: true, inherit: false, reload: true});
        };
        $scope.$on('$destroy', function(){
            coreApp.stopRefreshRate();
        });

        //Actions
        $scope.showRealSize = function (queue) {
            queueRest.getSize({name: queue.name},
                function success(value) {
                    $log.info('queueListController: realSize',value);
                    queue.realSize = value;
                }, function error(reason){
                    queue.realSize = 'n/a';
                });
        };

        $scope.showStorageRealSize = function (queue) {
            queueRest.getStorageSize({name: queue.name},
                function success(value) {
                    $log.info('queueListController: realSize',value);
                    queue.realSize = value;
                }, function error(reason){
                    queue.realSize = 'n/a';
                });
        };

        $scope.clear = function(queue) {
            coreApp.openConfirmModal('All current elements of the queue would be completely lost.',
                function confirmed() {
                    queueRest.clear(queue.name,function(value){
                        $log.log('queueListController: queue cleared', value);
                        loadModel();
                    }, function(reason){
                        coreApp.error('Queue draining failed',reason);
                    });
                });

        };

        $scope.remove = function(queue) {
            coreApp.openConfirmModal('Current queue, all of its content and actor preference data would be lost',
                function confirmed() {
                    queueRest.remove(queue.name,function(value){
                        $log.log('queueListController: queue removed', value);
                        loadModel();
                    }, function(reason){
                        coreApp.error('Queue removal failed',reason);
                    });
                });

        };


    })

    .controller('queueCardController', function ($log, $scope,  queueRest, coreApp, $state, $stateParams) {

        $scope.queueParams = angular.copy($stateParams);
        $log.info('queueCardController',$scope.queueParams);

        //Updates queue items by polling REST resource
        function loadModel() {
            $log.info('loadModel', $scope.queueParams);
            $scope.queuePage = queueRest.get($scope.queueParams,
                function success(value) {
                    $log.info('queueContentController: successfully updated queue content');
                    $scope.queuePageLoaded = value;
                    $scope.queuePageLoaded.$startIndex = coreApp.getStartIndex(value);
                    coreApp.refreshRate($scope.queueParams, loadModel);
                }, function error(reason) {
                    coreApp.error('Queue content update failed',reason);
                });
        }

        //Initialization:
        loadModel();

        //Update command:
        $scope.update = function () {
            $state.go('queue', angular.copy($scope.queueParams), {replace: true, inherit: false, reload: true});
        };

        //Finalization:
        $scope.$on('$destroy', function(){
            coreApp.stopRefreshRate();
        });

    });
