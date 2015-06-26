/*
	Design choice: I didn't run with emulating a click event here as others have done, because it bugged out on me. 
	Getting it to work when you have other features on the map was problematic, as they would steel the click event. 
	The scenario with touch and mouse combination i.e. microsoft surface was a problem too.
	I went with the touch events which are slightly more code but they were needed for polylineTouch and polygonTouch anyway. 
	So when it's all refactored this will be quite tidy. 
*/
L.Draw.MarkerTouch = L.Draw.Marker.extend({
	initialize: function (map, options) {
		L.Draw.Marker.prototype.initialize.call(this, map, options);
	},
	addHooks: function () {
		L.Draw.Marker.prototype.addHooks.call(this);
		if (!this._touchable) {
			this._touchable = new L.DrawTouch(this._map);
		}
		if (this._map) {
			console.dir(this._touchable);
			this._touchable.on({
				down: this._onTouchStart,
				move: this._onTouchMove,
				up: this._onTouchEnd
			}, this).enable();
		}
	},
	removeHooks: function () {
		L.Draw.Marker.prototype.removeHooks.call(this);
		if (this._map) {
			this._touchable.off({
				down: this._onTouchStart,
				move: this._onTouchMove,
				up: this._onTouchEnd
			}, this).disable();
		}
	},
	_onTouchStart: function (e) {
		this._currentLatLng = e.latlng;
		this._touchOriginPoint = L.point(e.clientX, e.clientY);
		//Disable mouse move event
		this._map.off('mousemove', this._onMouseMove, this);
	},
	_onTouchMove: function (e) {
		// Ensure we saved the starting point
		if (this._touchOriginPoint) {
			this._touchEndPoint = L.point(e.clientX, e.clientY);
		}
	},
	_onTouchEnd: function () {
		// Make sure we have a starting point
		if (this._touchOriginPoint) {

			if (this._touchEndPoint) {
				// If we have an end point we need to see how much it's moved before we decide if we save
				// We detect clicks within a certain tolerance, otherwise let it
				// be interpreted as a drag by the map
				var distanceMoved = L.point(this._touchEndPoint).distanceTo(this._touchOriginPoint);
				if (Math.abs(distanceMoved) < 9 * (window.devicePixelRatio || 1)) {
					this._marker = new L.Marker(this._currentLatLng, {
						icon: this.options.icon,
						zIndexOffset: this.options.zIndexOffset
					});
					this._onClick();
				}
			} else {
				// If there is no _touchEndPoint we save straight away as this means no movement i.e. definetly a click.
				this._marker = new L.Marker(this._currentLatLng, {
					icon: this.options.icon,
					zIndexOffset: this.options.zIndexOffset
				});
				this._onClick();
			}
		}
		//Enable mouse move event
		this._map.on('mousemove', this._onMouseMove, this);
		// No matter what remove the start and end point ready for the next touch.
		this._touchOriginPoint = null;
		this._currentLatLng = null;
		this._touchEndPoint = null;
	}
});