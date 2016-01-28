(function (window, angular, console, L, ionic, URL, navigator, Image) {
    'use strict';
    angular.module('starter.directives', [])

        .directive('imageOnload', function () {
            return {
                restrict: 'A',
                link: function (scope, element, attrs) {
                    element.bind('load', function () {
                        // call the function that was passed
                        //scope.$apply(attrs.imageOnload);
                window.URL.revokeObjectURL(this.src);
                        // usage: <img ng-src="src" image-onload="imgLoadedCallback()" />
                    });
                }
            };
        });
/*
        .directive("formular", function ($compile, $sce, $rootScope, $ionicActionSheet, $ionicPopup, $timeout, socket, idb) {
            return {
                restrict: "E",

                scope: {
                    formular: '=',
                    schema: '=',
                    overlay: '=',
                    doc: '=',
                    valid: '=',
                    id: '=',
                    parentkey: '=',
                    onDoc: '&'
                },
                templateUrl: 'templates/form.html',
                compile: function (tElement, tAttr) {
                    var contents = tElement.contents().remove();
                    var compiledContents;
                    return function (scope, iElement, iAttr) {
                        if (!compiledContents) {
                            compiledContents = $compile(contents);
                        }
                        compiledContents(scope, function (clone, scope) {
                            iElement.append(clone);
                        });
                    };
                },
                controller: function ($scope) {
                    $scope.fields = [];
                    $scope.files = {};
                    $scope.validate = function () {
                        $scope.$emit('validate');
                    };
                    $scope.stringType = function (type) {
                        return 'text';
                    };

                    var getField = function (key) {
                        for (var i = 0; i < $scope.formular.length; i++) {
                            var field = $scope.formular[i];
                            if (field.id === key) {
                                return field;
                            }
                        }
                        return null;
                    };
                    var updateFile = function (id) {
                        return function (err, res) {
                            $timeout(function () {
                                var fileURL = URL.createObjectURL(res);
                                $scope.files[id].src = $sce.trustAsResourceUrl(fileURL);
                            });
                        };
                    };

                    var convert = function () {
                        var field;
                        if (typeof ($scope.schema) !== 'undefined' && typeof ($scope.doc) !== 'undefined') {
                            angular.forEach($scope.schema.properties, function (value, key) {
                                $scope.valid[key] = {};
                                switch (value.type) {
                                    case 'object':
                                        var f = getField(key);
                                        if (f && f.type !== 'file') {
                                            $scope.doc[key] = $scope.doc[key] || {};
                                        }
                                        break;
                                    case 'string':
                                        if (typeof (value.default) !== "undefined" && !$scope.id) {
                                            $scope.doc[key] = value.default;
                                        } else if (typeof (value.format) !== "undefined" && value.format === 'date-time') {
                                            if (($scope.id && typeof ($scope.doc[key]) === 'undefined') || !$scope.id) {
                                                $scope.doc[key] = new Date();
                                            } else {
                                                $scope.doc[key] = new Date($scope.doc[key]);
                                            }
                                        }
                                        break;
                                    case 'boolean':
                                        if (!$scope.id && typeof (value.default) !== "undefined") {
                                            $scope.doc[key] = value.default;
                                        }
                                        break;
                                    default:
                                        if (!$scope.id && typeof (value.default) !== "undefined") {
                                            $scope.doc[key] = value.default;
                                        }
                                        break;
                                }
                            });
                            for (var i = 0; i < $scope.formular.length; i++) {
                                field = $scope.formular[i];
                                if (field.type === 'file') {
                                    $scope.files[field.id] = {};
                                    if ($scope.doc.hasOwnProperty(field.id)) {
                                        if ($scope.doc[field.id].data) {
                                            $scope.files[field.id].src = $scope.doc['tn_' + field.id].data; //URL.createObjectURL($scope.doc[field.id].data);
                                        }
                                    }
                                }
                            }
                        }
                        $scope.fields = [];
                        for (var j = 0; j < $scope.formular.length; j++) {
                            field = $scope.formular[j];

                            if ($scope.schema.oneOf && $scope.schema.oneOf.length > 0) {
                                $scope.schema.properties = $scope.schema.oneOf[0].properties;

                            }
                            var prop = $scope.schema.properties[field.id] || $scope.schema.oneOf[0][field.id];
                            var key = field.id;

                            var required = ($scope.schema.required && $scope.schema.required.indexOf(key) !== -1);

                            $scope.fields.push({
                                field: field,
                                key: key,
                                prop: prop,
                                title: prop.title || key,
                                required: required
                            });
                        }

                    };
                    if (typeof ($scope.schema) !== "undefined" && typeof ($scope.doc) !== "undefined") {
                        convert();
                    }
                    $scope.$watch('doc', function (newValue, oldValue) {
                        if (newValue != oldValue && typeof ($scope.schema) !== "undefined") {
                            $scope.onDoc(newValue);
                            convert();
                        }
                    });
                    $scope.$watch('overlay', function (newValue, oldValue) {
                        if (newValue != oldValue && typeof ($scope.schema) !== "undefined") {
                            $scope.onDoc(newValue);
                            convert();
                        }
                    });
                    $scope.$watch('schema', function (newValue, oldValue) {
                        if (newValue != oldValue && typeof ($scope.schema) !== "undefined") {
                            convert();
                        }
                    });
                    $scope.$watch('formular', function (newValue, oldValue) {
                        if (newValue != oldValue && typeof ($scope.schema) !== "undefined") {
                            for (var i = 0; i < $scope.formular.length; i++) {
                                var field = $scope.formular[i];
                                if (field.type === 'file') {
                                    $scope.files[field.id] = {};

                                }
                            }
                        }
                    });
                    $scope.changeCheckbox = function (key) {
                        if (!$scope.doc[key]) {
                            delete $scope.doc[key];
                        }
                    };
                    $scope.openFileDialog = function (id) {
                        if (window.cordova) {
                            //ionic-angular line 198
                            //element.remove();
                            var hideSheet = $ionicActionSheet.show({
                                titleText: 'Vælg foto',
                                buttons: [
                                    {
                                        text: 'Kamera'
                                    },
                                    {
                                        text: 'Album'
                                    },
                                ],

                                cancelText: 'Annuller',
                                cancel: function () {
                                    console.log('CANCELLED');
                                },
                                buttonClicked: function (index) {
                                    //hideSheet();
                                    var options = {
                                        quality: 50,
                                        destinationType: navigator.camera.DestinationType.DATA_URL,
                                        sourceType: navigator.camera.PictureSourceType.CAMERA,
                                        correctOrientation: true
                                    };
                                    if (index === 1) {
                                        options.sourceType = navigator.camera.PictureSourceType.PHOTOLIBRARY;

                                    }

                                    function onSuccess(imageData) {
                                        //var data = "data:image/jpeg;base64," + imageData;
                                        blobUtil.base64StringToBlob(imageData, 'image/jpeg').then(function (blob) {
                                            $scope.doc[id] = {
                                                'content_type': blob.type,
                                                data: blob
                                            };
                                            $scope.files[id] = {
                                                src: URL.createObjectURL(blob)
                                            };
                                            $scope.$apply();

                                        }).catch(function (err) {
                                            console.log(err);
                                        });

                                    }
                                    function onFail(message) {
                                        $ionicPopup.alert({
                                            title: 'Fejl',
                                            template: message
                                        });
                                    }
                                    navigator.camera.getPicture(onSuccess, onFail, options);
                                    return true;
                                }
                            });
                        } else {
                            var file = window.document.getElementById(id);
                            angular.element(file).one('change', function (event) {
                                var file = event.target.files[0];
                                $scope.files[id] = {
                                    name: file.name
                                };
                                var fileReader = new window.FileReader();
                                fileReader.onload = function (e) {
                                    var blob = new Blob([e.target.result], {
                                        type: file.type
                                    });
                                    $scope.doc[id] = {
                                        'content_type': blob.type,
                                        data: blob
                                    };
                                    $scope.files[id].src = URL.createObjectURL(blob);
                                    $scope.$apply();
                                };
                                fileReader.readAsArrayBuffer(file);
                            });
                            ionic.trigger('click', {
                                target: file
                            });
                        }
                    };
                }
            };
        });*/
})(this, this.angular, this.console, this.L, this.ionic, this.URL, this.navigator, this.Image);
