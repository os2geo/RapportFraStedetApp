L.Draw.PolylineTouch = L.Draw.Polyline.extend({
	initialize: function (map, options) {
		L.Draw.Polyline.prototype.initialize.call(this, map, options);
	},
	addHooks: function () {
		L.Draw.Polyline.prototype.addHooks.call(this);
		if (!this._touchable) {
			this._touchable = new L.DrawTouch(this._map);
		}
		if (this._map) {
			this._touchable.on({
				down: this._onTouchStart,
				move: this._onTouchMove,
				up: this._onTouchEnd
			}, this).enable();
		}
	},
	removeHooks: function () {
		L.Draw.Polyline.prototype.removeHooks.call(this);
		if (this._map) {
			if (this._map) {
				this._touchable.off({
					down: this._onTouchStart,
					move: this._onTouchMove,
					up: this._onTouchEnd
				}, this).disable();
			}
		}
	},
	_updateFinishHandler: function () {
		L.Draw.Polyline.prototype._updateFinishHandler.call(this);
		var distance, distancePixels,
			markerCount = this._markers.length,
			resolution = this._map.containerPointToLatLng([0, 0]).distanceTo(this._map.containerPointToLatLng([0, 1]));

		// It's not a line if it's not two points
		if (markerCount > 2) {
			/* 	The last marker should have a click handler to close the Polygon.
				When the user touches the screen I don't use the click event for the marker, this is because 
				we would need a relatively large marker to click on.
			 	Graphically this can look a bit crap. With this model we exffectively have a 
			 	click area of 24 pixels from the center of the marker no matter graphical marker size.
			 */
			distance = this._markers[markerCount - 2].getLatLng().distanceTo(this._markers[markerCount - 1].getLatLng());
			distancePixels = Math.floor(distance / resolution);
			if (distancePixels < 12 * (window.devicePixelRatio || 1)) {
				// Bit of a hack should refactor so updateFinishHandler is triggered before
				// addVertex.
				this.deleteLastVertex();
				this._finishShape();
			}
		}
	},
	_onTouchStart: function (e) {
		// Make sure it's a one fingure gesture and record the starting point
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
			// If we have an end point we need to see how much it's moved before we decide if we save
			// If there is no _touchEndPoint we save straight away
			if (this._touchEndPoint) {
				// We detect clicks within a certain tolerance, otherwise let it
				// be interpreted as a drag by the map
				var distanceMoved = L.point(this._touchEndPoint).distanceTo(this._touchOriginPoint);
				if (Math.abs(distanceMoved) < 9 * (window.devicePixelRatio || 1)) {
					this.addVertex(this._currentLatLng);
				}
			} else {
				this.addVertex(this._currentLatLng);
			}
		}

		//Enable mouse move event
		this._map.on('mousemove', this._onMouseMove, this);

		// No matter what remove the start and end point ready for the next touch.
		this._touchOriginPoint = null;
		this._touchEndPoint = null;
	}
});