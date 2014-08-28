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

define([
    'jquery'
], function($) {
    'use strict';

    /**
     * Replaces invalid characters in query parameters
     */
    var linkify = function(string) {
        return string.replace(/&/g,'%26')
    }

    /**
     * Send the form values on submit
     *
     * @api private
     */
    var onSubmit = function() {

        var discipline = $('#lg-js-discipline').val();
        var query = $('#input-find-a-resource').val();
        var contenttype = $('#lg-js-contenttype').val();

        var queryString = [];

        if (discipline) {
            queryString.push('s.fvf=Discipline,' + linkify(discipline) + ',false');
        }

        if (query) {
            queryString.push('s.q=' + linkify(query));
        }

        if (contenttype) {
            queryString.push('s.fvf=ContentType,' + linkify(contenttype) + ',false');
        }

        queryString = '/find-a-resource?' + queryString.sort().join('&');
        window.location = queryString;

        return false;
    };

    $('.lg-search-submit').on('click', onSubmit);
});
