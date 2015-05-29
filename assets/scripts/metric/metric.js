angular.module('metricModule', ['coreApp'])

    .factory('metricRest', function ($log, coreApp, $resource) {
        var restMetricUrl = coreApp.getRestUrl() + 'metrics/';

        return $resource(restMetricUrl + 'data/', {}, {
                //dictionaries
                dictionaryOptions: {url: restMetricUrl + 'options/', params: {}, cache: true}
                //dictionaryOptions: {url: '/scripts/metric/options.json', params: {}, cache: true}
            }
        );
    })


    .controller('metricListController', function ($log, $scope, metricRest, smoothRates, coreApp, $state,$stateParams) {
        $log.info('metricListController');


        function loadModel(params) {
            $log.info('Load model', $scope.resourceParams = params);
            $scope.metricsResource =  metricRest.query(function(restParams){
                    $log.info('metricsResource ',restParams);
                    restParams.dataset = coreApp.getKeys(restParams.dataset).join(',');
                    return restParams;
                }(angular.copy(params)),
                function success(value) {
                    $scope.metricsModel = value; //cause array or object
                    if ($scope.metricsModel) {
                        $log.info('Successfully updated metrics data');
                    } else {
                        coreApp.info('Metrics data not found', reason);
                    }
                    coreApp.refreshRate(params, loadModel);
                }, function error(reason) {
                    coreApp.error('Actors page update failed', reason);
                });
        }

        //Initialization:
        $scope.plotProps = {
            updatePeriod: 0,
            options: {
                zoom: {interactive: false},
                pan: {interactive: false}
//                xaxis: {ticks: 10},
//                yaxis: {ticks: 10}
            }
        };
        $scope.smoothRates = smoothRates;
        $scope.formParams = coreApp.copyStateParams();
        $scope.formParams.dataset = $scope.formParams.dataset ?
            coreApp.clearObject(JSON.parse($scope.formParams.dataset)) : {};

        $scope.isValidForm = function() {
            return $scope.formParams.type && $scope.formParams.scope &&
                $scope.formParams.period && $scope.formParams.metric &&
                angular.isObject($scope.formParams.dataset) &&
                _.size(coreApp.clearObject($scope.formParams.dataset))>0;
        };

        $scope.options = metricRest.dictionaryOptions({},
            function success(value) {
                $log.log('Loaded metric options dictionary', value);
                if($scope.options.metrics.length){
                    $scope.$showDatasets = !!_.find($scope.formParams.dataset,function(value,key){
                        return key !== $scope.formParams.metric;
                    });
                    $log.debug('$scope.$showDatasets',$scope.$showDatasets);
                    if($scope.isValidForm()){

                        loadModel(angular.copy($scope.formParams));
                    }
                }else{
                    coreApp.error('No available metrics to show', $scope.options);
                }

            }, function error(reason) {
                coreApp.error('Metrics options dictionary update failed', reason);
            });


        $scope.clearForm = function (){
            $scope.formParams.dataset = {};
            $scope.formParams.scope = undefined;
            $scope.formParams.type = undefined;
            $scope.formParams.period = undefined;
            $scope.$showDatasets = false;
        };


        //Update command:
        $scope.search = function () {
            var params = angular.copy($scope.formParams);
            params.dataset = JSON.stringify(coreApp.clearObject(params.dataset));
            coreApp.reloadState(params);
        };

        //Finalization:
        $scope.$on('$destroy', function () {
            coreApp.stopRefreshRate();
        });


    })

    .directive('metricsPlot', ['metricsFormatters', function (metricsFormatters) {
        return {
            restrict: 'CA',//Class, Attribute
            terminal: true,
            scope: {//'=' enables ability to $watch
                datasets: "=",
                width: "@",
                height: "@",
                addOptions: "="
            },
            controller: ['$scope', '$element', '$attrs', '$transclude', '$window', '$log', function ($scope, $element, $attrs, $transclude, $window, $log) {

                var jPlot = $($element);

                //Setting css width and height if explicitly set
                if($scope.width) { jPlot.css("width", $scope.width); }
                if($scope.height) { jPlot.css("height", $scope.height); }

                $("<div id='metrics-tooltip'></div>").css({
                    position: "absolute",
                    display: "none",
                    border: "1px solid #fdd",
                    padding: "2px",
                    backgroundColor: "#FFA801",
                    opacity: 0.80,
                    fontSize: "12px"
                }).appendTo("body");

                var defaultOptions = {
                    legend: {show: true},
                    grid: {
                        hoverable: true
//                        clickable: true
                    },
                    series: {
                        lines: {show: true},
                        points: {show: true}
                    }
                };

                var plotElem = $.plot(jPlot, [], defaultOptions);

                jPlot.bind("plothover", function (event, pos, item) {

                    if ($scope.datasets.length>0) {
                        var posX = metricsFormatters.getFormattedValue($scope.datasets[0].xFormatter, pos.x, false);
                        var posY = metricsFormatters.getFormattedValue($scope.datasets[0].yFormatter, pos.y, false);
                        if (angular.isNumber(posX)) {
                            posX = posX.toFixed(2);
                        }
                        if (angular.isNumber(posY)) {
                            posY = posY.toFixed(2);
                        }
                        $("#metrics-hoverdata .current").text("(" + posX + ", " + posY + ")");

                        if (item) {
                            var xVal = metricsFormatters.getFormattedValue($scope.datasets[0].xFormatter, item.datapoint[0], false);
                            var yVal = metricsFormatters.getFormattedValue($scope.datasets[0].yFormatter, item.datapoint[1], false);
                            $("#metrics-tooltip").html("[" + xVal + ", " + yVal + "]")
                                .css({top: item.pageY+5, left: item.pageX+5})
                                .fadeIn(200);
                        } else {
                            $("#metrics-tooltip").hide();
                        }
                    }

                });

                var updatePlotData = function(newData) {
                    $log.info("Update plot data. New datasets count: " + newData.length);

                    if (!!newData && newData.length>0) {
                        var newOptions = $.extend({}, defaultOptions);

                        if (!!newData[0].yFormatter && !!metricsFormatters[newData[0].yFormatter]) {
                            newOptions = $.extend(newOptions, {
                                yaxis: {
                                    tickFormatter: metricsFormatters[newData[0].yFormatter]
                                }
                            });
                        }

                        if (!!newData[0].xFormatter && !!metricsFormatters[newData[0].xFormatter]) {
                            newOptions = $.extend(newOptions, {
                                xaxis: {
                                    tickFormatter: metricsFormatters[newData[0].xFormatter]
                                }
                            });
                        }
                        newOptions = $.extend(newOptions, $scope.addOptions);

                        plotElem = $.plot(jPlot, newData, newOptions);
                    } else {
                        plotElem = $.plot(jPlot, [], defaultOptions);
                    }
                };

                $scope.$watch('datasets', function (newVal, oldVal) {

                    updatePlotData(newVal);
                });

                $scope.$watch('addOptions', function (newVal, oldVal) {
                    updatePlotData(plotElem.getData());
                }, true);

            }],
            replace: true
        };
    }])

    .factory("metricsFormatters", function ( $log) {
        var resultService = {
            time: function (val, axis) {
                return moment(new Date(val)).format('DD/MM HH:mm');
            },
            memory: function (bytes, axis) {
                if (!bytes || isNaN(parseFloat(bytes)) || !isFinite(bytes)) {
                    return '-';
                }
                var units = [' B', ' KB', ' MB', ' GB', ' TB', ' PB'],
                    number = Math.floor(Math.log(bytes) / Math.log(1024));
                return (bytes / Math.pow(1024, Math.floor(number))).toFixed(1) + ' ' + units[number];
            },
            getFormattedValue: function(formatterName, value, axis) {
                var result = value;
                if (!!formatterName && !!this[formatterName]) {
                    result = this[formatterName](value, axis);
                }
                return result;
            }
        };

        return resultService;
    })
;
