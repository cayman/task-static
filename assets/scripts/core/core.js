angular.module('coreApp', ['ngResource', 'ngSanitize', 'ui.router',
    'ui.bootstrap','ui.bootstrap.datetimepicker' ])

    .provider('coreApp', function () {
        console.log('coreApp.provider');
        var restUrl;
        var refreshRates = [0,5,10];
        var pageSizes = [50,100];
        var argTypes = ['string', 'boolean', 'integer', 'double', 'long', 'null'];
        var dialogConfirmConfig;
        var dialogStacktraceConfig;
        var dialogPropertiesConfig;

        this.setRestUrl = function (url) {
            restUrl = url;
        };

        this.setPageSize = function (size) {
            pageSizes = size;
        };

        this.setRefreshRates = function (rates) {
            refreshRates = rates;
        };

        this.setDialogConfirmConfig = function (dialogConfig){
            dialogConfirmConfig = dialogConfig;
        };

        this.setDialogStacktraceConfig = function (dialogConfig){
            dialogStacktraceConfig = dialogConfig;
        };

        this.setDialogPropertiesConfig = function (dialogConfig){
            dialogPropertiesConfig = dialogConfig;
        };

        this.$get = function ($log, $timeout, $modal, $filter, $rootScope) {

            var refreshRatePromise;
            var rawInterceptor = {
                response: function (response) {
                    $log.debug('return data:', response.data);
                    return response.data;
                },
                responseError: function (response) {
                    //@todo
                    $log.info('response error', response);
                    return response.data;
                }
            };

            function showMessage(level,title,reason){
                $rootScope.$broadcast('message-event',{
                    title: title,
                    level: level,
                    reason: reason
                });
            }

            return {
                //get Base rest url
                getRestUrl: function () {
                    return restUrl;
                },
                getRefreshRates: function () {
                    return refreshRates;
                },
                getPageSizes: function () {
                    return pageSizes;
                },
                getArgTypes: function () {
                    return argTypes;
                },
                getRawInterceptor: function () {
                    return rawInterceptor;
                },
                getStartIndex: function (model) {
                    if (angular.isArray(model))
                        return 1;
                    else
                        return (model.pageNumber - 1) * model.pageSize + 1;
                },
                getTotalCount: function (value) {
                    var items = angular.isArray(value) ? value : value.items;
                    var result = 0;
                    for (var i = 0; i < items.length; i++) {
                        result += items[i].count;
                    }
                    return result;
                },
                getIdValueArray: function (items) {
                    var result = [];
                    for (var i = 0; i < items.length; i++) {
                        if (items[i].id) {
                            result.push(items[i].id);
                        }
                    }
                    return result;
                },

                getKeysArray: function (list) {
                    var result = [];
                    for (var key in list) {
                        if (list.hasOwnProperty(key) && list[key]) {
                            result.push(key);
                        }
                    }
                    return result
                },
                objectSize: function(obj) {
                    var size = 0, key;
                    for (key in obj) {
                        if (obj.hasOwnProperty(key)) size++;
                    }
                    return size;
                },
                stopRefreshRate: function () {
                    if(refreshRatePromise){
                        $timeout.cancel(refreshRatePromise);
                        refreshRatePromise = null;
                    }
                },
                refreshRate: function (params, callback) {
                    this.stopRefreshRate();
                    if (params.refreshRate > 0) {
                        //call after refreshRate
                        refreshRatePromise = $timeout(function () {
                            if (params.refreshRate > 0) {
                                callback();
                            }
                        }, params.refreshRate * 1000);
                    }
                },
                getDateString: function (date){
                    return $filter('date')(date || new Date(), 'yyyy-MM-dd');
                },
                findDictionary: function (dictionary, id, field, defaultValue) {

                    if (dictionary.$resolved !== true)
                        return '...';
                    for (var i = 0, len = dictionary.length; i < len; i++) {
                        if (dictionary[i].id == id) {
                            $log.debug('found ',id, dictionary[i][field]);
                            return dictionary[i][field];
                        }
                        if (!defaultValue && dictionary[i].id == '_') {
                            defaultValue = dictionary[i][field];
                        }
                    }
                    $log.debug('not found ');
                    return defaultValue || 'Unknown';
                },
                forEach: function(list,callback){
                    if(angular.isArray(list)){
                        list.forEach(function (item,i) {
                              callback(item,i);
                        });
                    }else if(angular.isObject(list)){
                        for(var name in list){
                            if(list.hasOwnProperty(name) && !name.startsWith('$')){
                                callback(list[name],name);
                            }
                        }
                    }else{
                        callback(list,'=');
                    }
                },
                itemLength: function(list,callback){
                    if(angular.isArray(list)){
                        list.forEach(function (item,i) {
                            callback(item,i);
                        });
                    }else{
                        for(var name in list){
                            if(list.hasOwnProperty(name) && !name.startsWith('$')){
                                callback(list[name],name);
                            }
                        }
                    }
                },

                openModal: function (dialogConfig, params) {
                    dialogConfig.resolve = {
                        params: function () {
                            return params;
                        }
                    };
                    return $modal.open(dialogConfig);
                },
                openConfirmModal: function (message, confirmed) {
                    $log.info('Open confirm modal', message);
                    this.openModal(dialogConfirmConfig, {message: message})
                        .result.then(confirmed);
                },
                openStacktraceModal: function (message, title) {
                    $log.info('Open stacktrace modal', message);
                    this.openModal(dialogStacktraceConfig, {
                        title: title,
                        message: message
                    });
                },
                openPropertiesModal: function (properties, title) {
                    $log.info('Open properties modal', title);
                    this.openModal(dialogPropertiesConfig, {
                        title: title,
                        properties: properties
                    });
                },

                warn: function(title, reason){
                    $log.warn(title, reason);
                    showMessage('warning',title, reason);
                },
                info: function(title, reason){
                    $log.info(title, reason);
                    showMessage('info',title, reason);
                 },
                error: function(title,reason){
                    $log.error(title, reason);
                    showMessage('error',title, reason);
                }
            };
        };
        this.$get.$inject = ['$log', '$timeout', '$modal','$filter','$rootScope'];
    })
    // Config
    .config(function (datepickerConfig) {
        datepickerConfig.startingDay = 1;
        datepickerConfig.showWeeks = false;
        datepickerConfig.minDate="2010-01-01";
        datepickerConfig.maxDate="2050-01-01";
    })

    //Services
    .factory('coreRest', function ($log, coreApp, $resource) {
        var restUrl = coreApp.getRestUrl();
        var rawInterceptor = coreApp.getRawInterceptor();
        return $resource(restUrl, {}, {
            queryService: {url: restUrl + 'context/service/', method: 'GET', params: {}},
            getVersion: {url: restUrl + 'manifest/version/', method: 'GET', interceptor: rawInterceptor},
            getTime: {url: restUrl + 'timer/server_time', method: 'GET', interceptor: rawInterceptor}
        });
    })

    .factory('coreTree', function ($log, coreApp) {

        function walkRecursiveObject(list, baseItems, subItemsField, parent) {
            var subNum = 0;
            var contItems = baseItems.length;
            baseItems.forEach(function (baseItem) {
               // $log.debug('baseItem',baseItem);
                var item = angular.copy(baseItem);
                item.$children = baseItem[subItemsField] ? baseItem[subItemsField].length : 0;

                item.$key = list.length;
                item.$num = parent ? (parent.$num + '.' + (++subNum)) : ('' + (++subNum));
                item.$level = parent ? (parent.$level + 1 ) : 0;
                item.$parentKey = parent ? parent.$key : null;
                item.$expanded = !parent && (item.$children === 0 || contItems === 1);
                item[subItemsField] = null;

                item.$parent = function getParent(){
                    return this.$parentKey !== null ? list[this.$parentKey] : null;
                };

                item.$visible = function isVisible(){
                    if((this.$parentKey === null)) {
                        return true;
                    }
                    var parent = list[this.$parentKey];
                    return parent.$visible() && parent.$expanded;
                };

                item.$padding = function getPadding(intend) {
                    return {
                        'padding-left': this.$level * intend,
                        'display': 'inline-block',
                        'text-align': 'right',
                        'box-sizing': 'content-box',
                        'width': '30px'
                    };
                };

                item.$toggle = function toggleItem(){
                    this.$expanded = !this.$expanded;
                };

                list[item.$key] = item;

                if (item.$children > 0) {
                    walkRecursiveObject(list, baseItem[subItemsField], subItemsField, item);
                }
            });

        }

        function walkRecursiveProperty(list, baseItems, parent) {
            var subNum = 0;
            coreApp.forEach(baseItems,function(baseItemValue,baseItemId){
                // $log.debug('baseItem',baseItem);
                var item = { id:baseItemId};
                if(angular.isArray(baseItemValue)){
                    item.$children = baseItemValue.length;
                    item.value =  '[Array]('+item.$children +')';
                }else if(angular.isObject(baseItemValue)){
                    item.$children = coreApp.objectSize(baseItemValue);
                    item.value = '[Object]('+item.$children +')';
                }else{
                    item.value = baseItemValue !== null ? baseItemValue : 'null';
                    item.$children = 0;
                }

                item.$key = list.length;
                item.$num = parent ? (parent.$num + '.' + (++subNum)) : ('' + (++subNum));
                item.$level = parent ? (parent.$level + 1 ) : 0;
                item.$parentKey = parent ? parent.$key : null;
                item.$expanded = !parent && (subNum === 1 || item.$children === 0);

                item.$parent = function getParent(){
                    return this.$parentKey !== null ? list[this.$parentKey] : null;
                };

                item.$visible = function isVisible(){
                    if((this.$parentKey === null)) {
                        return true;
                    }
                    var parent = list[this.$parentKey];
                    return parent.$visible() && parent.$expanded;
                };

                item.$padding = function getPadding(intend) {
                    return {
                        'padding-left': this.$level * intend,
                        'display': 'inline-block',
                        'text-align': 'right',
                        'box-sizing': 'content-box',
                        'width': '30px'
                    };
                };

                item.$toggle = function toggleItem(){
                    this.$expanded = !this.$expanded;
                };

                list[item.$key] = item;

                if(item.$children > 0){
                     walkRecursiveProperty(list, baseItemValue, item);
                }

            });
        }

        return {
            getFlatArray: function(treeArray, subItemsField) {
                var flatArray = [];
                if (treeArray) {
                    walkRecursiveObject(flatArray, angular.isArray(treeArray) ? treeArray : [treeArray], subItemsField, null);
                }
                return flatArray;
            },
            getPropertyArray: function(tree) {
                var flatArray = [];
                if (tree) {
                    walkRecursiveProperty(flatArray, tree, null);
                }
                return flatArray;
            }
        };
    })

    //Directives
    .directive('treeProperties', function (coreTree) {
        return {
            restrict: 'A',
            transclude: false,
            scope: {properties: '=treeProperties'},
            templateUrl: '/views/core/tree-properties.html',
            replace: false,
            link: function (scope, element, attrs) {
                scope.treeProperties = [];
                scope.$watch('properties', function (value, oldValue) {
                    if (value) {
                        scope.treeProperties = coreTree.getPropertyArray(value);
                    }
                });
            }
        };
    })

    .directive('inputDate', function (coreTree,$timeout,coreApp) {
        return {
            restrict: 'A',
            transclude: false,
            scope: {dateModel: '=inputDate'},
            templateUrl: '/views/core/input-date.html',
            replace: false,
            link: function (scope, element, attrs) {
                scope.dateModel = scope.dateModel || coreApp.getDateString();
                scope.isOpen = false;
                scope.open = function () {
                    $timeout(function () {
                         scope.isOpen = true;
                    });
                };

                scope.currentText='Today';
                scope.toggleWeeksText= 'Weeks';
                scope.clearText='Clear';
                scope.closeText= 'Close';
            }
        };
    })

    .directive('inputTime', function ($log, coreApp) {
        return {
            restrict: 'A',
            transclude: false,
            scope: {timeModel: '=inputTime'},
            templateUrl: '/views/core/input-time.html',
            replace: false,
            link: function (scope, element, attrs) {
                scope.timeModel = scope.timeModel || coreApp.getDateString();

                scope.hstep = 1;
                scope.mstep = 5;

                scope.ismeridian = true;

                scope.changed = function () {
                    $log.log('Time changed to: ' + scope.timeModel);
                }

            }
        };
    })

    .directive('listReload', function ($log,coreApp) {
        return {
            restrict: 'EA',//Element, Attribute
            transclude: true,
            scope: {
                params: '=',
                model: '=',
                update: '&'
            },
            controller: function ($scope, $element, $attrs) {

                $scope.refreshRates = coreApp.getRefreshRates();

                $scope.$watch('params.refreshRate', function (value, oldValue) {
                    if (value !== oldValue) {
                        $scope.update();//update model
                    }
                });

            },
            templateUrl: '/views/core/list-reload.html',
            replace: true
        };
    })

    .directive('listPaginator', function ($log,coreApp) {

        function pageCount(model) {
            return Math.floor(model.totalCount / model.pageSize)
                + ( (model.totalCount % model.pageSize ) > 0 ? 1 : 0);

        }

        return {
            restrict: 'EA',//Element, Class, Attribute
            transclude: true,
            scope: {
                params: '=',
                model: '=',
                update: '&'
            },
            controller: function ($scope, $element, $attrs) {

                $scope.pageSizes = coreApp.getPageSizes();

                $scope.$watch('model', function (value) {
                    if (value) {
                        $scope.pageCount = pageCount($scope.model);
                    }
                });

                $scope.getMinIndex = function () {
                    if (angular.isArray($scope.model))//if simple array
                        return $scope.model.length > 0 ? 1 : 0;
                    return $scope.model.totalCount <= 0 ? 0 :
                    ($scope.model.pageNumber - 1) * $scope.model.pageSize + 1;
                };

                $scope.getMaxIndex = function () {
                    if (angular.isArray($scope.model)) //if simple array
                        return $scope.model.length;
                    return $scope.model.pageNumber < $scope.pageCount ?
                    $scope.model.pageNumber * $scope.model.pageSize :
                        $scope.model.totalCount;
                };

                $scope.isNextDisabled = function () {
                    return $scope.model.pageNumber >= $scope.pageCount;
                };


                //Update command:
                $scope.go = function (pageNum) {
                    $scope.params.pageNum = pageNum;
                    $scope.update();//update model
                };

                $scope.$watch('params.pageSize', function (value, oldValue) {
                    if (value !== oldValue) {
                        $scope.go(1);//update model
                    }
                });


            },
            templateUrl: '/views/core/list-paginator.html',
            replace: true
        };
    })

    .directive('pageHeader', function ($window) {
        return {
            restrict: 'A',
            transclude: true,
            scope: {title: '@pageHeader'},
            templateUrl: '/views/core/page-header.html',
            replace: false,
            link: function (scope, element, attrs) {
                scope.back = function () {
                    $window.history.back();
                };
            }
        };
    })

    .directive('pageMessage', function ($log) {
        return {
            restrict: 'AE',
            transclude: false,
            scope: false,
            templateUrl: '/views/core/page-message.html',
            replace: true,
            controller: function ($scope, $element, $attrs) {
                $scope.messageEvent = null;
                $scope.$on('message-event', function(event, message) {
                    $log.info('message:event',message);
                    $scope.messageEvent = message;
                    var isObject = angular.isObject(message.reason);

                    if (isObject && message.reason.stack) {
                        $scope.messageEvent.message = message.reason.message;
                        $scope.messageEvent.detail = message.reason.stack;
                    } else if (isObject && message.reason.status) {
                        $scope.messageEvent.message = 'Status ' + message.reason.status;
                        $scope.messageEvent.message +=
                            (message.reason.data && message.reason.data.trim().length>0) ?
                            ('(' + message.reason.statusText + '):' + message.reason.data) :
                            ' : ' + message.reason.statusText;
                        $scope.messageEvent.detail = message.reason.config;

                    } else {
                        $scope.messageEvent.message = message.reason;
                    }

                });
            }
        };
    })

    .directive('onEnter', function () {
        return {
            restrict: 'A',
            link: function (scope, element, attrs) {
                element.bind('keydown keypress', function (event) {
                    if (event.which === 13) {
                        scope.$apply(function () {
                            scope.$eval(attrs.onEnter);
                        });
                        event.preventDefault();
                    }
                });
            }
        };
    })


    //Filters
    .filter('prettyStack', function (processRest, coreApp, $log) {
        return function (message) {
            return message.replace(new RegExp('([.,])\\s', 'ig'), '$1' +'<br/>')
                .replace(new RegExp('\\s([{])', 'ig'), '<br/>' + '$1' )
                .replace(new RegExp('[\\n]', 'ig'), '<br/>' );

        };
    })
    .filter('lineWrap', function ($log) {
        var words = {};
        function skippingIndexOf(word, skip, char) {
            var result = -1;
            if (word && word.length>skip) {
                var subResult = word.substr(skip).indexOf(char);
                if (subResult >= 0) {
                    result = subResult + skip;
                }
            }
            //$log.log("skipping index for [" + word + "] is [" + result + "]");
            return result;
        }

        function parseWord(word, skip, delimiter){
            var skippingIndex = skippingIndexOf(word, skip || 25, delimiter || '.');
            if (skippingIndex >=0) {
                //$log.log("skippingIndex["+skippingIndex+"] for["+word+"], sub1["+word.substr(0, skippingIndex+1)+"], sub 2["+word.substr(skippingIndex+1)+"]");
                return words[word] = word.substr(0, skippingIndex+1) + '<wbr>' + word.substr(skippingIndex+1);
            }
            return words[word] = word;
        }
        return function (word, skip, delimiter) {
            return words[word] || parseWord(word, skip, delimiter);
        }
    })
    .filter('prettyStack', function (processRest, coreApp, $log) {
        return function (message) {
            return message.replace(new RegExp('([.,])\\s', 'ig'), '$1' +'<br/>')
                .replace(new RegExp('\\s([{])', 'ig'), '<br/>' + '$1' );

        };
    })

    //Controllers
    .controller('ModalDialogController', function ($log, $scope, $modalInstance, params) {

        $scope.params = params;

        $scope.close = function (result) {
            $modalInstance.close(result);
        };

        $scope.cancel = function () {
            $modalInstance.dismiss('cancel');
        };

    });
