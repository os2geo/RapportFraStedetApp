(function (angular) {
    'use strict';
    angular.module('starter.controllers').controller('loginCtrl', function ($state, $scope, $rootScope, socket, $ionicHistory) {
		$ionicHistory.nextViewOptions({
			historyRoot: true,
			disableBack: true
		});
		$rootScope.$on('authenticated', function (data) {
			$state.go($rootScope.toState.name, $rootScope.toParams);
		});
        $scope.cancel=function(){
            $state.go($rootScope.fromState.name, $rootScope.fromParams);
        };
	});
} (this.angular));