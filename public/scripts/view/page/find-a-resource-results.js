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
    'lodash',
    'jquery',
    'config',
    'view/dropdown-selector',
    'view/search-box',
    'bootstrap-collapse'
], function(_, $, config, DropdownSelector) {
    'use strict';

    var ResultsPage = function() {
        this.initialize();
    };
    _.extend(ResultsPage.prototype, {
        'initialize': function() {
            _.bindAll(this);
            this.typeSelector = new DropdownSelector({
                'el': '.js-type-dropdown',
                'input': '.js-type-input'
            });
            this.disciplineSelector = new DropdownSelector({
                'el': '.js-discipline-dropdown',
                'input': '.js-discipline-input'
            });
            this.collapseHiddenFacets();
            this.bindEvents();
        },

        'collapseHiddenFacets': function() {
            var hiddenFacets = this.getHiddenFacetsData();
            var currentSearchData = this.getSearchData();
            // If the saved search is the same as the current one we can collapse the facets
            if (hiddenFacets && hiddenFacets.keyword === currentSearchData.keyword) {
                _.each(hiddenFacets.facets, function(facetId) {
                    var $element = $('#' + facetId);
                    var $link = $('[href="#' + facetId + '"]');
                    $element.collapse('hide');
                    $link.addClass('collapsed');
                });
            } else {
                // Otherwise the saved hiddenFacets should be reset
                this.removeHiddenFacetsData();
            }
        },

        'bindEvents': function() {
            var $facets = $('.js-facet');
            $facets.on('show.bs.collapse', this.onFacetShow);
            $facets.on('hide.bs.collapse', this.onFacetHide);

            // Show or hide the "more" facets
            var $more = $('.lg-facet-more');
            $more.on('click', function(e) {
                var $container = $(e.currentTarget).parent().parent().find('.js-facet-more-container');
                $container.toggle();
                var txt = $container.is(':visible') ? 'less' : 'more';
                $(e.currentTarget).find('.lg-facet-more-change').html(txt);
                return false;
            });
        },

        'getSearchData': function() {
            // Return the used search api and keyword saved in the DOM
            if (!this.searchData) {
                var $results = $('.js-search-results');
                this.searchData = {
                    'keyword': $results.data('keyword')
                };
            }
            return this.searchData;
        },

        'getHiddenFacetsData': function() {
            var data = localStorage.getItem(config.localStorage.facetCollapse);
            return JSON.parse(data);
        },

        'setHiddenFacetsData': function(facets) {
            var data = JSON.stringify(_.extend(this.getSearchData(), {
                'facets': facets
            }));

            // Try catch to handle safari private browsing mode
            try {
                localStorage.setItem(config.localStorage.facetCollapse, data);
            } catch(error) {}
        },

        'removeHiddenFacetsData': function() {
            localStorage.removeItem(config.localStorage.facetCollapse);
        },

        'onFacetShow': function(event) {
            var hiddenFacets = this.getHiddenFacetsData().facets;
            var facetId = $(event.currentTarget).attr('id');
            this.setHiddenFacetsData(_.without(hiddenFacets, facetId));
        },

        'onFacetHide': function(event) {
            var hiddenFacetsData = this.getHiddenFacetsData();
            var hiddenFacets = [];
            if (hiddenFacetsData && hiddenFacetsData.facets) {
                hiddenFacets = hiddenFacetsData.facets;
            }

            var facetId = $(event.currentTarget).attr('id');
            if (hiddenFacets.indexOf(facetId) < 0) {
                hiddenFacets.push(facetId);
                this.setHiddenFacetsData(hiddenFacets);
            }
        }
    });

    return ResultsPage;
});
