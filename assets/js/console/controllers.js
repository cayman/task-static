angular.module("console.controllers", ['queue.controllers', 'console.services', 'ui.bootstrap.modal', 'console.actor.controllers', 'console.schedule.controllers', 'console.interrupted.controllers', 'ngRoute', 'console.metrics.controllers'])

.controller("rootController", function ($rootScope, $scope, $location, $log, $window, $http) {

    $scope.serverVersion = "";

    $scope.updateVersion = function() {
        $http.get("/rest/console/manifest/version").then(function(success) {
            $scope.serverVersion = success.data || "";
        }, function(error) {
            $log.error(error);
            $scope.serverVersion = "";
        });
    }

    $scope.isActiveTab = function (rootPath) {
        var result = "";
        if ($location.url().indexOf(rootPath) == 0) result = "active";
        return result;
    };

    $scope.encodeURI = function (value) {
        return encodeURIComponent(value);
    };

    $scope.back = function () {
        $window.history.back();
    };

    $scope.updateVersion();

})

.controller("queueCardController", function ($scope, tskQueues, tskTimeUtil, $log, $routeParams) {

    $scope.feedback = "";

    //Init paging object
    $scope.queueTasksPage = {
        pageSize: 5,
        pageNumber: 1,
        totalCount: 0,
        items: []
    };

    $scope.queueName = $routeParams.queueName;

    //Updates queue items by polling REST resource
    $scope.update = function () {
        tskQueues.getQueueContent($scope.queueName, $scope.queueTasksPage.pageNumber, $scope.queueTasksPage.pageSize).then(function (value) {
            $scope.queueTasksPage = angular.fromJson(value.data || {});
            $log.info("queueContentController: successfully updated queue content");
        }, function (errReason) {
            $scope.feedback = errReason;
            $log.error("queueContentController: queue content update failed: " + errReason);
        });

    };

    //Initialization:
    $scope.update();

})

.controller("processListController", function ($scope, tskProcesses, tskTimeUtil, $log, $modal) {
    $scope.initialized = false;

    //Init paging object
    $scope.processesPage = {
        pageSize: 5,
        pageNumber: 1,
        totalCount: 0,
        items: []
    };

    $scope.states = [
        {status: -1, name: "All"},
        {status: 0, name: "Started"},
        {status: 1, name: "Finished"},
        {status: 2, name: "Failed"},
        {status: 3, name: "Aborted"}
    ];

    $scope.getStatusName = function(status) {
        var result = "Unknown [" + status + "]";
        if (status == 0) {
            result = "Still has unreleased tasks";
        } else if (status == 1) {
            result = "Has already finished";
        } else if (status == 2) {
            result = "Has failed tasks, manual fix required";
        }  else if (status == 3) {
            result = "Aborted";
        }
        return result;
    };

    $scope.selection = {
        state: $scope.states[0],
        type: ''
    };

    $scope.submittedRecoveries = [];

    $scope.wasSubmitted = function (processId) {
        for (var i = 0; i<$scope.submittedRecoveries.length; i++) {
            if (processId == $scope.submittedRecoveries[i]) {
                return true;
            }
        }
        return false;
    };

    $scope.addProcessToRecovery = function(processId) {
        tskProcesses.addProcessToRecovery(processId);
        $scope.submittedRecoveries.push(processId);
    };

    $scope.abortProcess = function(processId) {
        $modal.open({
            templateUrl: '/partials/view/modal/approve_msg.html',
            windowClass: 'approve',
            controller: function ($scope) {
                $scope.description = "Current process, it's graph, all tasks and decisions will be deleted";
            }
        }).result.then(function(okMess) {
                tskProcesses.abortProcess(processId).then(function(ok){
                    $scope.refresh();
                }, function(errReason){
                    $scope.feedback = angular.toJson(errReason);
                    $log.error("processListController: process abort failed: " + $scope.feedback);
                    $scope.initialized = true;
                });
            }, function(cancelMsg) {
                //do nothing
            }
        );
    };

    //Updates queues states  by polling REST resource
    $scope.update = function () {

        tskProcesses.getProcessesList($scope.processesPage.pageNumber, $scope.processesPage.pageSize, $scope.selection).then(function (value) {
            $scope.processesPage = angular.fromJson(value.data || {});
            $scope.initialized = true;
            $log.info("processListController: successfully updated processes list, params: pageNum["+$scope.processesPage.pageNumber+"], pageSize["+$scope.processesPage.pageSize+"], status["+$scope.selection.state.status+"]");
        }, function (errReason) {
            $scope.feedback = errReason;
            $scope.initialized = true;
            $log.error("processListController: process list update failed: " + errReason);
        });

    };

    $scope.$watch('selection.state', function (newVal, oldVal) {
        //Initialization:
        $scope.update();
    });

    $scope.refresh = function() {
        $scope.initialized = false;
        $scope.update();
    };
})

.controller("processCreateController", function ($scope, $log, tskProcesses, $location) {
        $scope.types = ["DECIDER_START"];
        $scope.task = {
            actorId: "",
            method: "",
            args: [],
            type: $scope.types[0],
            taskList: ""
        };

        var isCommandValid = function(command) {
            return !!command.actorId && command.actorId.length>0 && !!command.method && command.method.length>0;
        };

        $scope.createProcess = function(){
            var command = {
                actorId: $scope.task.actorId,
                method: $scope.task.method,
                taskType: $scope.task.type,
                args: $scope.task.args,
                taskList: $scope.task.taskList
            };
            if (isCommandValid(command)) {
                $log.log("Try to create process with command", command);
                tskProcesses.createProcess(command).then(function (success) {
                    $log.log("Process create success", success.data);
                    $location.url("/processes/process?processId=" + success.data);
                }, function (error) {
                    $log.log("Process create error", error);
                });
            }
        };

        $scope.isValidForm = function() {
            return isCommandValid($scope.task);
        };
    })

.controller("processCardController", function ($scope, tskProcesses, tskTimeUtil, $log, $routeParams, $location, $modal) {
    $scope.process = {};
    $scope.taskTree = {};
    $scope.processId = $routeParams.processId;
    $scope.feedback = "";
    $scope.initialized = false;

    $scope.recoverProcess = function (processId) {

        $modal.open({
            templateUrl: '/partials/view/modal/approve_msg.html',
            windowClass: 'approve',
            controller: function ($scope) {
                $scope.description = "Process will be sent to recovery service.";
            }
        }).result.then(function(okMess) {
                tskProcesses.addProcessToRecovery(processId).then(function (success) {
                    $location.url("/processes/list");
                }, function (error) {
                    $log.log("Process recovery error", error);
                    $scope.feedback = angular.toJson(error);
                });
            }, function(cancelMsg) {
                //do nothing
            });
    };

    $scope.cloneProcess = function (processId) {
        $modal.open({
            templateUrl: '/partials/view/modal/approve_msg.html',
            windowClass: 'approve',
            controller: function ($scope) {
                $scope.description = "A new process with the same start task arguments would be created.";
            }
        }).result.then(function(okMess) {
                tskProcesses.cloneProcess(processId).then(function (success) {
                    $log.log("Process clone success", success.data);
                    $location.url("/processes/process?processId=" + success.data);
                }, function (error) {
                    $log.log("Process clone error", error);
                    $scope.feedback = angular.toJson(error);
                });
            }, function(cancelMsg) {
                //do nothing
            });
    };

    $scope.update = function () {
        tskProcesses.getProcess($routeParams.processId).then(function (value) {
            $scope.process = angular.fromJson(value.data || {});
            $log.info("processCardController: successfully updated process[" + $routeParams.processId + "] content");

            tskProcesses.getProcessTree($routeParams.processId, $scope.process.startTaskUuid).then(function (value) {
                $scope.taskTree = angular.fromJson(value.data || {});
                $scope.initialized = true;
                $log.info("processCardController: successfully updated process[" + $routeParams.processId + "]/["+$scope.process.startTaskUuid+"] tree");
            }, function (errReason) {
                $scope.feedback = angular.toJson(errReason);
                $scope.initialized = true;
                $log.error("processCardController: process[" + $routeParams.processId + "] tree update failed: " + $scope.feedback);
            });

        }, function (errReason) {
            $scope.feedback = angular.toJson(errReason);
            $scope.initialized = true;
            $log.error("processCardController: process[" + $routeParams.processId + "] update failed: " + $scope.feedback);
        });
    };

    $scope.update();
})

.controller("processSearchController", function ($scope, tskProcesses, tskTimeUtil, $log, $routeParams, $location) {//params: customId, processId
    $scope.customId = $routeParams.customId || '';
    $scope.processId = $routeParams.processId || '';
    $scope.processes = [];

    $scope.update = function () {
        tskProcesses.findProcess($scope.processId, $scope.customId).then(function (value) {
            $scope.processes = angular.fromJson(value.data || []);
            $location.search("customId", $scope.customId);
            $location.search("processId", $scope.processId);
            $log.info("processSearchController: successfully found["+$scope.processes.length+"] processes");
        }, function (errReason) {
            $scope.feedback = angular.fromJson(errReason);
            $log.error("processSearchController: process search failed: " + $scope.feedback);
        });
    };

    $scope.update();

})

.controller("taskListController", function ($scope, $$data, $log) {

    $scope.feedback = "";
    $scope.initialized = false;

    //Init paging object
    $scope.tasksPage = {
        pageSize: 5,
        pageNumber: 1,
        totalCount: 0,
        items: []
    };

    //Updates queues states  by polling REST resource
    $scope.update = function () {

        $$data.listTasks($scope.tasksPage.pageNumber, $scope.tasksPage.pageSize).then(function (value) {
            $scope.tasksPage = angular.fromJson(value.data || {});
            $scope.initialized = true;
            $log.info("taskListController: successfully updated tasks page");
        }, function (errReason) {
            $scope.feedback = angular.toJson(errReason);
            $scope.initialized = true;
            $log.error("queueListController: tasks page update failed: " + $scope.feedback);
        });

    };

    //Initialization:
    $scope.update();

})

.controller("taskCardController", function ($scope, $$data, $routeParams, $log) {
    $scope.task = {};
    $scope.taskTree = {};
    $scope.taskDecision = {};
    $scope.taskId = $routeParams.taskId;
    $scope.processId = $routeParams.processId;

    $scope.initialized = false;

    $scope.feedback = "";

    $scope.update = function () {
        $$data.getTask($routeParams.taskId, $routeParams.processId).then(function (value) {
            $scope.task = angular.fromJson(value.data || {});
            $log.info("taskController: successfully updated task[" + $routeParams.taskId + "] content");

            $$data.getTaskTree($routeParams.taskId, $routeParams.processId).then(function (value) {
                $scope.taskTree = angular.fromJson(value.data || {});
                $scope.initialized = true;
                $log.info("taskController: successfully updated task tree[" + $routeParams.taskId + "] content");

                $$data.getTaskDecision($routeParams.taskId, $routeParams.processId).then(function (value) {
                    $scope.taskDecision = angular.fromJson(value.data || {});
                    $scope.initialized = true;
                    $log.info("taskController: successfully updated task decision[" + $routeParams.taskId + "] content");
                }, function (errReason) {
                    $scope.feedback = angular.toJson(errReason);
                    $scope.initialized = true;
                    $log.error("taskController: task[" + $routeParams.taskId + "] tree update failed: " + $scope.feedback);
                });

            }, function (errReason) {
                $scope.feedback = angular.toJson(errReason);
                $scope.initialized = true;
                $log.error("taskController: task[" + $routeParams.taskId + "] tree update failed: " + $scope.feedback);
            });

        }, function (errReason) {
            $scope.feedback = angular.toJson(errReason);
            $scope.initialized = true;
            $log.error("taskController: task[" + $routeParams.taskId + "] update failed: " + $scope.feedback);
        });
    };

    $scope.update();

})

.controller("taskSearchController", function ($scope, $routeParams, $$data, $log, $location) {
    $scope.taskId = $routeParams.taskId || '';
    $scope.processId = $routeParams.processId || '';
    $scope.tasks = [];

    $scope.initialized = false;

    $scope.update = function () {
        if($scope.taskId || $scope.processId) {
            $$data.findTasks($scope.processId, $scope.taskId).then(function (value) {
                $scope.tasks = angular.fromJson(value.data || []);
                $location.search("processId", $scope.processId);
                $location.search("taskId", $scope.taskId);
                $scope.initialized = true;
                $log.info("taskSearchController: found [" + $scope.tasks.length + "] tasks");
            }, function (errReason) {
                $scope.feedback = angular.toJson(errReason);
                $scope.initialized = true;
                $log.error("taskSearchController: task search update failed: " + $scope.feedback);
            });
        }
    };

    $scope.update();

})

.controller("hoveringQueuesController", function ($scope, $$data, tskTimeUtil, $log) {

    $scope.feedback = "";

    //Init paging object
    $scope.queues = [];

    $scope.periodSize = 2;

    $scope.totalTasks = function () {
        var result = 0;
        for (var i = 0; i < $scope.queues.length; i++) {
            result = result + $scope.queues[i].count;
        }
        return result;
    };

    //Updates queues states  by polling REST resource
    $scope.update = function () {

        $$data.getHoveringQueues($scope.periodSize).then(function (value) {
            $scope.queues = angular.fromJson(value.data || {});
            $log.info("queueListController: successfully updated queue state");
        }, function (errReason) {
            $scope.feedback = errReason;
            $log.error("queueListController: queue state update failed: " + errReason);
        });

    };

    //Initialization:
    $scope.update();

})

.controller("repeatedTasksController", function ($scope, $routeParams, $$data, $log) {
    $scope.iterationCount = 5;
    $scope.tasks = [];

    $scope.update = function () {
        $$data.getRepeatedTasks($scope.iterationCount).then(function (value) {
            $scope.tasks = angular.fromJson(value.data || {});
            $log.info("repeatedTasksController: tasks loaded successfully");
        }, function (errReason) {
            $scope.feedback = errReason;
            $log.error("repeatedTasksController: load repeated tasks failed: " + errReason);
        });
    };

    $scope.update();

})

.controller("homeController", function ($scope, $http, $log) {
        $scope.configInvisible = true;
        $scope.propsInvisible = true;

        $scope.serverServicesBeans = {};
        $scope.properties = {};
        $scope.startupDate = 0;

        $scope.updateContextInfo = function() {
            $http.get("/rest/console/context/service").then(function(success){
                $scope.serverServicesBeans = success.data.configBeans || {};
                $scope.properties = success.data.properties || {};
                $scope.startupDate = success.data.startupDate || 0;
            }, function(error) {
                $log.log("Cannot update context info: " + angular.toJson(error));
            });
        };

        $scope.updateContextInfo();

    })

.controller("aboutController", function ($scope) {

});


