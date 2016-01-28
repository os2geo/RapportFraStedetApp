(function (angular) {
    'use strict';
    angular.module('starter.controllers').controller('menuCtrl', function ($scope, $rootScope, $ionicSideMenuDelegate, $ionicModal) {
		var _modals ={};
        
        $scope.activeInfo = false;
        $rootScope.showInfo = function () {
            $ionicSideMenuDelegate.toggleRight();
            $scope.activeInfo = true;
            if (_modals.hasOwnProperty('about')) {
                _modals.about.show();
            } else {
                $ionicModal.fromTemplateUrl('templates/modal-info.html', {
                    scope: $scope,
                    backdropClickToClose: false
                }).then(function (modal) {
                    _modals.about = modal;
                    $scope.closeInfo = function(){
                        modal.hide();
                        $scope.activeInfo = false;
                    }
          
                    modal.show();
                });
            }
        };
	});
} (this.angular));

