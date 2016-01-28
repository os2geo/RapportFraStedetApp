(function (angular) {
    'use strict';
    angular.module('starter.controllers').controller('introCtrl', function ($scope, $state, $localStorage) {
        $scope.start = function () {
            $localStorage['os2geo:intro'] = false;
            $state.go('menu.organizations');
        };
	});
} (this.angular));


