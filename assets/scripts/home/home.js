angular.module('homeModule', ['coreApp'])

    .controller('homeController', function ($scope, $http, coreApp, coreRest, $log) {
        $log.info('homeController');

        function loadModel() {
            $log.info('loadModel');
            coreRest.getVersion({},
                function success(value) {
                    $scope.serverVersion = value;
                },
                function error(reason) {
                    $log.error(reason);
                    $scope.serverVersion = '-';
                });

            $scope.servicePage = coreRest.queryService({},
                function success(value) {
                    $log.info('indexController: successfully updated service', value);
                }, function error(reason) {
                    coreApp.error('Service update failed',reason);
                });
        }

        //Initialization:
        loadModel();

    });