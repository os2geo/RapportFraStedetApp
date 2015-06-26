/*
 * L.DrawTouch allows you to add touch capabilities to leaflet draw handlers.
 */

L.DrawTouch = L.Class.extend({
	includes: L.Mixin.Events,
	initialize: function (map) {
		this._map = map;
	},
	enable: function () {
		if (this._enabled) {
			return;
		}
		if (this._map) {
			L.DomEvent.addListener(this._map._container, 'touchstart', this._onTouchStart, this);
		}
		this._enabled = true;
	},
	disable: function () {
		if (!this._enabled) {
			return;
		}
		if (this._map) {
			L.DomEvent.removeListener(this._map._container, 'touchstart', this._onTouchStart, this);
		}
		this._enabled = false;
	},
	_normaliseEvent: function (e) {
		L.DomUtil.disableImageDrag();
		L.DomUtil.disableTextSelection();

		var first = e.touches ? e.touches[0] : e,
			containerPoint = this._map.mouseEventToContainerPoint(first),
			layerPoint = this._map.mouseEventToLayerPoint(first),
			latlng = this._map.layerPointToLatLng(layerPoint);

		return {
			latlng: latlng,
			layerPoint: layerPoint,
			containerPoint: containerPoint,
			clientX: first.clientX,
			clientY: first.clientY,
			originalEvent: e
		};
	},
	_onTouchStart: function (e) {
		// Make sure it's a one finger gesture and record the starting point
		if (e.touches.length === 1) {
			this.fire('down', this._normaliseEvent(e));
			L.DomEvent.addListener(this._map._container, 'touchmove', this._onTouchMove, this);
			L.DomEvent.addListener(this._map._container, 'touchend', this._onTouchEnd, this);
		}
	},
	_onTouchMove: function (e) {
		// Ensure we saved the starting point
		this.fire('move', this._normaliseEvent(e));
	},
	_onTouchEnd: function () {
		this.fire('up');
		L.DomEvent.removeListener(this._map._container, 'touchmove', this._onTouchMove, this);
		L.DomEvent.removeListener(this._map._container, 'touchend', this._onTouchEnd, this);
	}
});