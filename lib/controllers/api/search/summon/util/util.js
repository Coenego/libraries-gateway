/*!
 * Copyright 2014 Digital Services, University of Cambridge Licensed
 * under the Educational Community License, Version 2.0 (the
 * "License"); you may not use this file except in compliance with the
 * License. You may obtain a copy of the License at
 *
 *     http://opensource.org/licenses/ECL-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an "AS IS"
 * BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express
 * or implied. See the License for the specific language governing
 * permissions and limitations under the License.
 */

var _ = require('underscore');
var crypto = require('crypto');
var normalizer = require('normalizer');
var querystring = require('querystring');
var util = require('util');

var config = require('../../../../../../config');
var libUtil = require('lg-util/lib/util');
var log = require('lg-util/lib/logger').logger();
var ResultModel = require('../../../../../models/search/result');
var searchUtil = require('../../../../../util/search');

////////////////////////
//  PUBLIC FUNCTIONS  //
////////////////////////

/**
 * Function that constructs the query string for the Summon API request
 *
 * @param  {Object}     parameters
 * @param  {String[]}   _queryString
 */
var constructRequestQueryString = module.exports.constructRequestQueryString = function(parameters, _queryString) {
    var queryString = _.clone(_queryString);

    // Check if an ID has been specified
    if (parameters.id) {
        queryString.push(util.format('s.fids=%s', parameters.id));
    }

    _.each(parameters, function(value, key) {
        if (_.isArray(value)) {
            _.each(value, function(param) {
                param = _.map(param.split(','), function(val) { return normalizer.normalize(val, true); }).join(',').replace(/&/g, '%26');
                queryString.push(util.format('%s=%s', key, param));
            })
        } else {
            value = _.map(value.split(','), function(val) { return normalizer.normalize(val, true); }).join(',').replace(/&/g, '%26');
            queryString.push(util.format('%s=%s', key, value));
        }
    });

    // Convert the querystring to a string
    queryString = queryString.sort().join('&');

    // Return the querystring
    return queryString;
};

/**
 * Function that constructs the request url
 *
 * @return {Object}     queryString     Request options object
 */
var constructRequestOptions = module.exports.constructRequestOptions = function(queryString) {

    // Create the header object that will be sent to the Summon API
    var headers = {
        'Accept': 'application/json',
        'x-summon-date': _getUTCDate(),
        'Host': config.constants.engines.summon.uri,
        'Version': config.constants.engines.summon.version
    };

    // Convert the header to a string to create a hash afterwards
    var headerString = _constructHeaderString(headers) + decodeURIComponent(queryString) + '\n';

    // Create a hash from the application key and the headerString
    var sha1Digest = crypto.createHmac('sha1', config.secret.summon.auth.key).update(headerString).digest('base64');

    // Construct the header authentication string
    var authHeaderString = 'Summon ' + config.secret.summon.auth.id + ';' + sha1Digest;
    headers['Authorization'] = authHeaderString;

    // Construct the request url
    var url = util.format('http://%s%s?%s', headers['Host'], headers['Version'], queryString);

    // Create an options object that can be submitted to the Summon API
    var options = {
        'method': 'GET',
        'url': url,
        'timeout': config.constants.engines.summon.timeout,
        'headers': headers
    };

    // Return the options
    return options;
};

/**
 * Function that creates an overview of all the selected facets and their values
 *
 * @param  {Object}     parameters      The query parameters
 * @return {Array}                      The returned facetsOverview collection
 */
var createFacetOverview = module.exports.createFacetOverview = function(parameters) {

    // Convert the object to an array
    var params = [];
    _.each(parameters, function(value, key) {
        if (_.isArray(value)) {
            _.each(value, function(param) {
                var obj = {};
                obj[key] = param;
                params.push(obj);
            });
        } else {
            var obj = {};
            obj[key] = value;
            params.push(obj);
        }
    });

    // Properties to ignore
    var toIgnore = ['facet', 'id', 's.pn', 'x', 'y'];

    // Remove the parameters that should be ignored
    var _parameters = [];
    _.each(params, function(value) {
        var key = _.keys(value)[0];
        if (_.indexOf(toIgnore, key) < 0) {
            _parameters.push(value);
        }
    });

    // Construct the url for each of the facets
    var overview = [];
    _.each(_parameters, function(parameter) {

        if (_.keys(parameter)[0] !== 's.q') {

            var appliedFacet = {
                'type': null,
                'value': null,
                'url': null
            };

            // Take away the current facet from the collection
            var params = _.reject(_parameters, function(param) { return parameter === param; });

            // Create the url
            var url = [];
            _.each(params, function(param) {
                var key = _.keys(param)[0];
                url.push(util.format('%s=%s', key, param[key].replace(/&/g, '%26').replace(/\s/g, '+')));
            });

            appliedFacet.url = url.sort().join('&');

            // Create a label for the filter
            var label = parameter[_.keys(parameter)[0]].split(',');
            if (label.length >= 2) {
                appliedFacet.type = label[0];
                appliedFacet.value = label[1];
            } else {
                appliedFacet.value = label[0];
            }

            overview.push(appliedFacet);
        }
    });

    return overview;
};

/**
 * Function that fetches all the authors from a resource
 *
 * @param  {Array}  item    The item data
 * @return {Array}          The value of the requested item property
 */
var getResourceAuthors = module.exports.getResourceAuthors = function(item) {
    try {
        var authors = [];
        _.each(item['Author_xml'], function(row) {
            if (row.fullname) {
                authors.push(new ResultModel.Author(row.fullname));
            }
        });
        if (authors && !authors.length) authors = null;
        return authors;
    } catch(error) {
        log().error(error);
        return null;
    }
};

/**
 * Function that fetches the resource publication data
 *
 * @param  {Object}           item       The item data
 * @return {PublicationData}             The created PublicationData model
 */
var getResourcePublicationData = module.exports.getResourcePublicationData = function(item) {
    try {

        // Date
        var day = null;
        var month = null;
        var year = null;

        if (item['PublicationDate_xml'] && item['PublicationDate_xml'][0]) {
            if (item['PublicationDate_xml'][0]['day']) {
                day = item['PublicationDate_xml'][0]['day'];
            }
            if (item['PublicationDate_xml'][0]['month']) {
                month = item['PublicationDate_xml'][0]['month'];
            }
            if (item['PublicationDate_xml'][0]['year']) {
                year = item['PublicationDate_xml'][0]['year'];
            }
        }

        var lblDate = _.compact([day, month, year]).join('-');
        var publicationDate = new ResultModel.PublicationDate(day, month, year, lblDate);

        var publicationTitle = null;
        if (item['PublicationTitle'] && item['PublicationTitle'][0]) {
            publicationTitle = libUtil.putInArrayIfNotNull(libUtil.consolidateValue(item['PublicationTitle']));
        }

        var publicationVolume = null;
        if (item['Volume']) {
            publicationVolume = libUtil.putInArrayIfNotNull(libUtil.consolidateValue(item['Volume']));
        }

        var publicationIssue = null;
        if (item['Issue']) {
            publicationIssue = libUtil.putInArrayIfNotNull(libUtil.consolidateValue(item['Issue']));
        }

        // Pages
        var startPage = null;
        if (item['StartPage'] && item['StartPage'][0]) {
            startPage = libUtil.consolidateValue(item['StartPage'][0]);
        }

        var endPage = null;
        if (item['EndPage'] && item['EndPage'][0]) {
            startPage = libUtil.consolidateValue(item['EndPage'][0]);
        }

        var lblPage = _.compact([startPage, endPage]).join('-');
        var publicationPage = new ResultModel.PublicationPage(startPage, endPage, lblPage);

        // Create a new publication data model
        var publicationData = new ResultModel.PublicationData(publicationTitle, publicationDate, publicationVolume, publicationIssue, publicationPage);
        return publicationData;

    } catch(error) {
        log().error(error);
        return null;
    }
};

/**
 * Function that picks the data for a specific property out of a record
 *
 * @param  {Array}  item    The item data
 * @return {Array}          The value of the requested item property
 */
var getPropertyData = module.exports.getPropertyData = function(item, key) {
    try {
        var value = null;
        if (item[key]) {
            value = _cleanUpValue(item[key]);
            if (!_.isArray(item[key])) {
                return [value];
            }
        }
        return value;
    } catch(error) {
        log().error(error);
        return null;
    }
};

//////////////////////////
//  INTERNAL FUNCTIONS  //
//////////////////////////

/**
 * Strips the value down to a simple string
 *
 * @param  {String}  value    The value thad needs to be stripped
 * @return {String}           The cleaned up value
 */
var _cleanUpValue = function(value) {
    if (value) {
        if (_.isArray(value)) {
            return _.map(value, function(item) { return item.replace(/<\/?h>/g,'') });
        }
        return value.replace(/<\/?h>/g,'');
    }
    return null;
};

/**
 * Converts the header object to a string, needed for the Summon authentication
 *
 * @param  {Object}  header    Object containing all the header information
 * @return {String}            String that will be used as a hash for the authentication
 * @api private
 */
var _constructHeaderString = function(header) {
    var headerString = '';
    _.each(header, function(value, key) {
        headerString += value + '\n';
    });
    return headerString;
};

/**
 * Returns a date in UTC format
 *
 * @return {Date}          The date in a UTC format
 * @api private
 */
var _getUTCDate = function() {
    var d = new Date();
    return d.toUTCString();
};
