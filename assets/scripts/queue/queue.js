angular.module('queueModule', ['coreApp'])

    .factory('queueRest', function ($log, coreApp, $resource) {
        var restQueueUrl = coreApp.getRestUrl() + 'queues/';
        var rawInterceptor = coreApp.getRawInterceptor();

        return $resource(coreApp.getRestUrl() + 'queue/:queueName', {}, {
                getSize: {url: restQueueUrl + ':name/size', interceptor:rawInterceptor},
                getStorageSize: {url: restQueueUrl + ':name/storage/size', interceptor:rawInterceptor},
                //list
                query: {url: restQueueUrl, params: {}},
                //queryHovering: {url: coreApp.getRestUrl() + 'hoveringQueues/', params: {}, isArray: true},
                //actions
                clear: {url: restQueueUrl + 'clear', method: 'POST', interceptor:rawInterceptor},
                remove: {url: restQueueUrl + 'remove', method: 'POST', interceptor:rawInterceptor}

            }
        );
    })

    .controller('queueListController', function ($log, $scope, queueRest, coreApp) {
        $log.info('queueListController');

        //function getRest(params) {
        //    return params.periodSize ? queueRest.queryHovering : queueRest.query;
        //}

        function loadModel(params) {
            $log.info('Load model',$scope.loadParams = params);
            $scope.tempQueuesModel = queueRest.query(params,
                function success(value) {
                    $scope.queuesModel = coreApp.parseListModel(value);//cause array or object
                    if($scope.queuesModel){
                        $log.info('Successfully updated queues page');
                        $scope.queuesModel.$totalTasks = _.reduce($scope.queuesModel.items, function(sum, item) {
                            return sum + item.count;
                        }, 0);
                    }else{
                        coreApp.info('Processes not found',value);
                    }
                    coreApp.refreshRate(params, loadModel);
                }, function error(reason) {
                    coreApp.error('Queues page update failed',reason);
                });
        }

        //Initialization:
        $scope.formParams = coreApp.copyStateParams();
        loadModel(angular.copy($scope.formParams));

        //Submit form command:
        $scope.search = function () {
            coreApp.reloadState($scope.formParams);
        };

        //Finalization:
        $scope.$on('$destroy', function () {
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
                        loadModel($scope.loadParams);
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
                        loadModel($scope.loadParams);
                    }, function(reason){
                        coreApp.error('Queue removal failed',reason);
                    });
                });

        };

    });
