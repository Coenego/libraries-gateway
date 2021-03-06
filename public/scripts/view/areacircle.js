define([
    'jquery',
    'lodash',
    'util/events',
    'view/map'
], function($, _, events, map) {
    'use strict';

    var AreaCircle = function() {};
    _.extend(AreaCircle.prototype, {
        'initialize': function() {
            _.bindAll(this);
            var self = this;
            map.locateCurrentPosition(function(error, latLng) {
                if (error) {
                    return;
                }

                // Once the users position is found initialize the circle on the
                // map.
                self.circle = new google.maps.Circle({
                    'map': map.getGoogleMap(),
                    'center': latLng,
                    'clickable': false,
                    'radius': 1000,
                    'strokeColor': '#0000FF',
                    'strokeOpacity': 0.4,
                    'strokeWeight': 1,
                    'fillColor': '#0000FF',
                    'fillOpacity': 0.07,
                    'visible': false
                });
            });
        },

        'setRadius': function(radius) {
            this.circle.setRadius(radius);
        },

        'show': function() {
            this.circle.setVisible(true);
        },

        'hide': function() {
            this.circle.setVisible(false);
        },

        'latLngInArea': function(lat, lng) {
            var latLng = new google.maps.LatLng(lat, lng);
            var bounds = this.circle.getBounds();
            return bounds.contains(latLng);
        }
    }, events);

    return new AreaCircle();
});
