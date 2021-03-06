define([
    'lodash',
    'util/events',
    'util/extend'
], function(_, events, extend) {
    'use strict';
    var BaseModel = function(attributes) {
        var self = this;
        _.forIn(attributes, function(value, key) {
            self.set(key, value);
        });
    };
    _.extend(BaseModel.prototype, {
        'get': function(key) {
            return this.attributes[key];
        },

        'set': function(key, value) {
            this.attributes || (this.attributes = {});
            this.attributes[key] = value;
            this.trigger('change:' + key, this, value);
            this.trigger('change', this, value);
        },

        'toJSON': function() {
            return _.clone(this.attributes);
        }
    }, events);

    _.extend(BaseModel, extend);
    return BaseModel;
});
