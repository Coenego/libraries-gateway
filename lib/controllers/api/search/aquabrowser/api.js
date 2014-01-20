var _ = require('underscore');
var qs = require('querystring');
var request = require('request');
var xml2js = require('xml2js');

var config = require('../../../../../config');

var apiUtil = require('./util/util');
var log = require('../../../../util/logger').logger();
var searchUtil = require('../../../../util/search');

var FacetModel = require('../../../../models/search/facet');
var ResultModel = require('../../../../models/search/result');
var ResultsModel = require('../../../../models/search/results');

var ResourceModelFactory = require('../../../../factories/api/search/ResourceModelFactory');

/**
 * Function that returns the results from Aquabrowser
 *
 * @see http://www.lib.cam.ac.uk/api/docs/ab_sru.htm
 * @see http://www.lib.cam.ac.uk/libraries/login/documentation/doc_Aquabrowser.html

 * Multiple formats
 * http://search.lib.cam.ac.uk/result.ashx?&q=title:Darwin format:book format:ebook&noext=false&searchmode=assoc&curpage=1&cmd=find&output=xml
 * http://search.lib.cam.ac.uk/result.ashx?&q=title%3ADarwin%20format%3Abook%20format%3Aebook&noext=false&searchmode=assoc&curpage=1&cmd=find&output=xml

 * All the facets
 * http://search.lib.cam.ac.uk/RefinePanel.ashx?inlibrary=true&noext=false&debug=&lastquery=Darwin&lvq=Darwin&lsi=user&uilang=en&searchmode=assoc&hardsort=def&skin=cambridge&rctx=AAMAAAABAAAAAwAAAE5BAQAJY2FtYnJpZGdlBkRhcndpbgZEYXJ3aW4AAAAAAARmaW5kBHVzZXIAAAADZGVmBHVzZXIFYXNzb2MBAAAAAAAAAAJlbgEA%2F%2F%2F%2F%2F9opAAAAAAAAAwAAAAZpXzM2MGkKdGY1bHU5eW01bgZjX292ZXIBMQRpX2ZrAAAAAAA%3D&c_over=1&curpage=1&concept=Darwin&branch=&ref=&i_fk=&mxdk=-2&undup=false&q=Darwin&si=user&cmd=refanalyze&t_dim=Format&t_method=-1&output=xml
 *
 * Availability
 * http://search.lib.cam.ac.uk/availability.ashx?hreciid=[RESOURCE-ID]&output=xml
 *
 * @param  {Boolean}    isAquabrowser       Indicates if Aquabrowser has been specified explicitly
 * @param  {String}     parameters          Query parameters
 * @param  {Function}   callback            The callback function
 * @param  {Error}      callback.error      Error object to be send with the callback function
 * @param  {Results[]}  callback.results    Collection of results to be send with the callback function
 */
var getResults = module.exports.getResults = function(isAquabrowser, parameters, callback) {

    // Check if we're looking for a specific resource (ID)
    var isDetailRequest = false;

    // The queryString variable only contains parameters for the items themselves
    var queryString = [];

    // The extraParams contain parameters to do the search in the external API
    var extraParams = ['cmd=find', 'output=xml', 'searchmode=assoc', 'noext=false'];

    // Check if a parameters object is specified
    if (parameters) {

        // Check if an ID is set (e.g. 123456)
        if (parameters['id']) {
            isDetailRequest = true;
            queryString.push('id:' + parameters['id']);

        } else {

            // Check if a query is set (e.g. Darwin)
            if (parameters['q']) {
                queryString.push(parameters['q']);
            }

            // Parameters which can only be added if the API is specified in the UI (facets)
            if (isAquabrowser) {

                // Aquabrowser additional search parameters

                // Check if the branch is set (e.g. University Main Library)
                if (parameters['branch']) {
                    extraParams.push('branch="' + parameters['branch'] + '"');
                }

                // Check if the current page is set (e.g. 2)
                if (parameters['page']) {
                    extraParams.push('curpage=' + parameters['page']);
                }

                // Aquabrowser query parameters

                // Check if the format is set (e.g. `books`, `journals`,...)
                if (parameters['format'] && parameters['format'] !== 'all') {
                    queryString.push('format:"' + parameters['format'] + '"');
                }

                // Check if the author is set (e.g.`Charles Darwin`)
                if (parameters['author']) {
                    queryString.push('author:"' + parameters['author'] + '"');
                }

                // Check if the language is set (e.g. `English`, `German`,...)
                if (parameters['language']) {
                     queryString.push('language:"' + parameters['language'] + '"');
                }

                // Check if the MDTags are set (e.g. `evolution`, `science`, `darwin`,...)
                if (parameters['mdtags']) {
                     queryString.push('mdtags:"' + parameters['mdtags'] + '"');
                }

                // Check if the person is set (e.g. `Darwin, Charles`, `Huxley, Thomas Henry`,...)
                if (parameters['person']) {
                     queryString.push('person:"' + parameters['person'] + '"');
                }

                // Check if the region is set (e.g. `England`, `Great Britain`,...)
                if (parameters['region']) {
                     queryString.push('region:"' + parameters['region'] + '"');
                }

                // Check if the series parameter is set (e.g. `The Pickering masters`,`The works of Charles Darwin`,...)
                if (parameters['series']) {
                     queryString.push('series:"' + parameters['series'] + '"');
                }

                // Check if the subject is set (e.g. `Evolution`, `Natural selection`,...)
                if (parameters['subject']) {
                     queryString.push('subject:"' + parameters['subject'] + '"');
                }

                // Check if the timeperiod is set (e.g. `19th century`, `20th century`,...)
                if (parameters['timeperiod']) {
                     queryString.push('timeperiod:"' + parameters['timeperiod'] + '"');
                }

                // Check if the uniform title is set (e.g. `On the origin of species`,...)
                if (parameters['uniformtitle']) {
                     queryString.push('uniformtitle:"' + parameters['uniformtitle'] + '"');
                }
            }
        }
    }

    // Construct the url for the request
    extraParams.push('q=' + encodeURIComponent(queryString.join(' ')));
    var url = config.constants.engines.aquabrowser.uri + '?' + extraParams.sort().join('&');

    // Create an options object that can be submitted to the Aquabrowser API
    var options = {
        'url': url,
        'timeout': config.constants.engines.aquabrowser.timeout
    };

    // Perform the request to the Aquabrowser API
    request(options, function(error, res, body) {
        if (error) {
            log().error(error);
            return callback('An error occurred while fetching Aquabrowser data');
        }

        // Remove all the whitespaces and tags from the xml
        var xml = res.body.trim();
        xml = xml.replace(/<\/?exact>|<\/?nonexact>/g, '');

        // Create an options object for the JSON parsing
        var parseOpts = {
            'explicitArray': false,
            'explicitChildren': true,
            'mergeAttrs': true,
            'trim': true
        };

        // Parse the XML as a JSON string
        xml2js.parseString(xml, parseOpts, function(error, res) {
            if (error || !res.root) {
                if (error) log().error(error);
                return callback('An error occurred while fetching Aquabrowser data');
            }

            // Initialize some variables
            var numRecords = 0;
            var aquabrowserResults = [];
            var facets = [];
            var facetsOverview = (isAquabrowser) ? searchUtil.createFacetOverview(parameters) : [];

            try {

                /**
                 * Function that creates models for objects which should always be present, even if no results are found
                 * @api private
                 */
                var _createGlobalInformation = function() {

                    // Get the pagination
                    _getPagination(res, parameters, function(error, pagination) {
                        if (error) {
                            log().error(error);
                            return callback('An error occurred while fetching Aquabrowser data');
                        }

                        // Only if no records are found, we request the suggestions from the Aquabrowser API
                        var suggestions = null;
                        if (numRecords === 0) {
                            _getSuggestions(parameters, function(error, suggestions) {
                                if (error) {
                                    return callback('An error occurred while fetching Aquabrowser data');
                                }

                                // Put all the result models into a containing results model
                                var results = new ResultsModel.Results(numRecords, facets, facetsOverview, aquabrowserResults, pagination, suggestions);
                                return callback(null, results);
                            });

                        // If records are found
                        } else {

                            // Put all the result models into a containing results model
                            var results = new ResultsModel.Results(numRecords, facets, facetsOverview, aquabrowserResults, pagination, suggestions);
                            return callback(null, results);
                        }
                    });
                }

                // If no matching records were found
                if (res.root.feedbacks.noresults) {

                    _createGlobalInformation();

                // Loop all the Aquabrowser results
                } else {

                    numRecords = parseInt(res.root.feedbacks.standard.resultcount, 10);

                    var records = res['root']['results']['record'];
                    var recordsCreated = 0;

                    /**
                     * Function that creates a resource model
                     *
                     * @param  {Number}  recordsToCreate    Object containing resource data
                     * @param  {Object}  record             Object containing resource data
                     * @api private
                     */
                    var _doCreateResourceModel = function(recordsToCreate, record) {

                        // Create the resource model
                        _createResourceModel(isDetailRequest, record, function(error, resource) {
                            if (error) {
                                log().error(error);
                                return callback('An error occurred while fetching Aquabrowser data');
                            }

                            // Add the model to the results collection
                            aquabrowserResults.push(resource);
                            recordsCreated++;

                            // If all the records have been created
                            try {
                                if (recordsCreated === recordsToCreate) {

                                    // Get the facets
                                    _getFacets(res, parameters, function(error, _facets) {
                                        if (error) {
                                            log().error(error);
                                            return callback('An error occurred while fetching Aquabrowser data');
                                        }

                                        // Populate the global facets collection
                                        facets = _facets;

                                        _createGlobalInformation();
                                    });
                                }
                            } catch(error) {
                                log().error(error);
                                return callback('An error occurred while fetching Aquabrowser data');
                            }
                        });
                    };

                    // If a resource detail is requested
                    if (isDetailRequest) {

                        // If the item occurs in multiple databases, it is returned as an array with multiple instances of itself.
                        // We select the first item since this is the most relevant one.
                        if (_.isArray(records)) {
                            records = records[0];
                        }

                        // Create a model for the resource
                        _doCreateResourceModel(1, records);

                    // If a global search was performed
                    } else {

                        // Check if the records are returned as an array
                        if (_.isArray(records)) {

                            // Store the number of records that need a model
                            var recordsToCreate = records.length;

                            // Loop all the resource records
                            _.each(records, function(record, index) {

                                // Create a model for the resource
                                _doCreateResourceModel(recordsToCreate, record);
                            });

                        } else {
                            _doCreateResourceModel(1, records);
                        }
                    }
                }

            } catch(error) {
                log().error(error);
                return callback('An error occurred while fetching Aquabrowser data');
            }
        });
    });
};

/**
 * Function that creates an availability model
 *
 * @param  {Object}       availability            The availability information for a specific branch
 * @return {Branch}                               The returned branch
 * @api private
 */
var _createAvailabilityModel = function(availability) {
    var location = availability.location;
    var sublocation = availability.sublocation;
    var status = availability.status;
    var itemCount = availability.itemcount;
    var externalDatasourceName = availability.externalDatasourceName || null;
    var nativeId = availability.nativeId || null;
    var placeHoldUrl = availability.placeHoldUrl || null;
    var notes = availability.notes || null;
    var branch = new ResultsModel.Branch(location, sublocation, status, itemCount, externalDatasourceName, nativeId, placeHoldUrl, notes);
    return branch;
};

/**
 * Function that creates a resource model
 *
 * @param  {Boolean}   isDetailRequest    Indicates if function is called during a detail request (true|false)
 * @param  {Object}    record             The resource record
 * @param  {Function}  callback           The callback function
 * @param  {Error}     callback.error     Error object to be send with the callback function
 * @param  {Result}    callback.result    The created resource model
 * @api private
 */
var _createResourceModel = function(isDetailRequest, record, callback) {
    try {

        // Create an object to store our model data
        var modelData = {
            'id': apiUtil.getResourceID(record),
            'src': apiUtil.getResourceSource(record),
            'extId': apiUtil.getResourceExtID(record),
            'titles': apiUtil.getResourceTitles(record),
            'isbn': apiUtil.getResourceISBN(record),
            'eisbn': null,
            'issn': null,
            'ssid': null,
            'authors': apiUtil.getResourceAuthors(record),
            'published': apiUtil.getResourcePublicationData(record),
            'subjects': apiUtil.getResourceSubjects(record),
            'series': apiUtil.getResourceSeries(record),
            'notes': apiUtil.getResourceNotes(record),
            'contentType': apiUtil.getResourceContentType(record),
            'thumbnails': apiUtil.getResourceThumbnails(record),
            'links': apiUtil.getResourceLinks(record),
            'branches': null
        };

        if (!modelData.id) {
            return callback('Invalid or no resource ID returned from server');
        }

        // Fetch the availability information for the resource before returning the results (async request)
        if (isDetailRequest) {
            _getItemAvailability(modelData.extId, function(error, branches) {
                if (error) {
                    log().error(error);
                    return callback(error);
                }
                modelData.branches = branches;
                return callback(null, ResourceModelFactory.createResourceModel(modelData));
            });

        } else {
            return callback(null, ResourceModelFactory.createResourceModel(modelData));
        }

    } catch(error) {
        log().error(error);
        return callback('An error occurred while fetching Aquabrowser data');
    }
};

/**
 * Function that fetches the resource availibility
 *
 * @param  {String}    extID                The external ID of the resource item (e.g. |cambrdgedb|2099538)
 * @param  {Function}  callback             The callback function
 * @param  {Error}     callback.error       Error object to be send with the callback function
 * @param  {Array}     callback.branches    Collection of results to be send with the callback function
 * @api private
 */
var _getItemAvailability = function(extID, callback) {

    try {

        // Create a new collection for the branches that store the resource
        var branches = [];

        // Request options object
        var options = {
            'url': config.constants.engines.aquabrowser.uri_availability + '?hreciid=' + extID + '&output=xml'
        };

        // Perform a request to the availability API
        request(options, function(error, response, body) {
            if (error) {
                log().error(error);
                return callback('Error while fetching availability information');
            }

            // Parse the received XML from the API
            try {

                // Create an options object for the JSON parsing
                var parseOpts = {
                    'explicitArray': false,
                    'mergeAttrs': true
                };

                xml2js.parseString(body, parseOpts, function(error, res) {
                    _.each(res.root, function(database) {

                        // If the availability information is returned as an array
                        if (_.isArray(database.availability)) {
                            _.each(database.availability, function(branch) {
                                branches.push(_createAvailabilityModel(branch));
                            });

                        // When the availability information contains only one object
                        } else {
                            branches.push(_createAvailabilityModel(database.availability));
                        }
                    });
                });

                // Return a collection of branches where the items are available
                return callback(null, branches);

            } catch(error) {
                log().error(error);
                return callback('Error while fetching availability information');
            }
        });

    } catch(error) {
        log().error(error);
        return callback('Error while fetching availability information');
    }
};

/**
 * Function that fetches the facets for the search results
 *
 * @param  {Object}       res                     The response from the Aquabrowser API
 * @param  {Object}       parameters              The query parameters
 * @param  {Function}     callback                The callback function
 * @param  {Error}        callback.error          Error object to be send with the callback function
 * @param  {Result}       callback.facets         Collection containing all the facets
 */
var _getFacets = function(res, parameters, callback) {

    // Create a new collection for the facets
    var facetCollection = [];

    try {
        // Loop all the facets from the result
        if (res.root.refine && res.root.refine.d) {

            // Store the facet data in a variable
            var facetTypes = res.root.refine.d;

            // Check if an array is returned
            if (!_.isArray(facetTypes)) {
                facetTypes = [facetTypes];
            }

            // Loop all the facet categories
            _.each(facetTypes, function(facetType) {

                // Pick all the necessary properties from the facetType
                var facetTypeLabel = facetType.rawlbl;
                var facetTypeAmount = facetType.t;

                if (!_.isArray(facetType.kw)) {
                    facetType.kw = [facetType.kw];
                }

                // Create a new Facet model for each facet
                var facets = [];
                _.each(facetType.kw, function(facet) {

                    // Pick all the necessary properties from the facet
                    var facetLabel = facet.lbl;
                    var facetAmount = parseInt(facet.c, 10);
                    var facetUrl = searchUtil.createFacetUrl(parameters, facetTypeLabel, facetLabel);

                    // Create a new facet model
                    var facetModel = new FacetModel.Facet(facetLabel, facetAmount, facetUrl);
                    facets.push(facetModel);
                });

                // Create a new FacetType model
                var facetTypeModel = new FacetModel.FacetType(facetTypeLabel, facetTypeAmount, facets);
                facetCollection.push(facetTypeModel);
            });
        }

        return callback(null, facetCollection)

    } catch(error) {
        log().error(error);
        return callback('An error occurred while fetching Aquabrowser data');
    }
};

/**
 * Function that creates the pagination for the returned Aquabrowser results
 *
 * @param  {Object}       res                     The response from the Aquabrowser API
 * @param  {Object}       parameters              Query parameters
 * @param  {Function}     callback                The callback function
 * @param  {Error}        callback.error          Error object to be send with the callback function
 * @param  {Result}       callback.pagination     Collection containing all the facets
 */
var _getPagination = function(res, parameters, callback) {

    // Create a pagination model
    try {

        // Initialize some variables
        var page = null;
        var pager = null;
        var pageNumber = 0;
        var pageCount = 0;
        var firstPage = 0;
        var lastPage = 0;

        // Since we don't want to have changes in our original query object, we need to clone the parameters
        var params = _.clone(parameters);
        params.api = 'aquabrowser';

        // If pager information is available
        if (res.root.feedbacks.pager) {

            // Store the pagination information
            pager = res.root.feedbacks.pager;

            pageNumber = parseInt(pager.currentpage, 10);

            // We only support the first 50 pages of the results
            pageCount = parseInt(pager.totalpages, 10);
            if (pageCount > config.nodes['find-a-resource'].settings.pageLimit) pageCount = config.nodes['find-a-resource'].settings.pageLimit;

            firstPage = 1;

            lastPage = parseInt(pager.totalpages, 10);
            if (lastPage > config.nodes['find-a-resource'].settings.pageLimit) lastPage = config.nodes['find-a-resource'].settings.pageLimit;

        // If no pager information is available, but standard feedback is provided
        } else if (res.root.feedbacks.standard) {

            // Store the pagination information
            pager = res.root.feedbacks.standard;

            pageNumber = parseInt(pager.currentpage, 10);
            pageCount = firstPage = lastPage = 1;
        }

        var pagination = searchUtil.createPaginationModel(params, pageNumber, pageCount, firstPage, lastPage);
        return callback(null, pagination);

    } catch(error) {
        log().error(error);
        return callback('An error occurred while fetching Aquabrowser data');
    }
};

/**
 * Function that creates a suggestions model for the search results
 *
 * @param  {Object}       parameters              Query parameters
 * @param  {Function}     callback                Standard callback function
 * @param  {Error}        callback.error          Error object to be send with the callback function
 * @param  {Suggestions}  callback.suggestions    Collection of suggestions to be send with the callback function
 * @api private
 */
var _getSuggestions = function(parameters, callback) {

    // Clone the parameters object
    var params = _.clone(parameters);

    // Initialize some variables
    var originalQuery = null;
    var suggestedItems = [];

    // Construct the request url
    var url = config.constants.engines.aquabrowser.uri_suggestions + '?q=' + parameters.q;

    // Do a request to the Aquabrowser API
    request({'url': url}, function(error, res, body) {
        if (error) {
            log().error(error);
            return callback('An error occurred while fetching Aquabrowser data');
        }

        // Create an options object for the JSON parsing
        var parseOpts = {
            'trim': true,
            'mergeAttrs': true
        };

        try {
            // Parse the returned XML
            xml2js.parseString(body, parseOpts, function(error, res) {
                if (error || !res.cloud) {
                    if (error) log().error(error);
                    return callback('An error occurred while fetching Aquabrowser data');
                }

                // Fetch the original entered query
                if (res.cloud.concept) {
                    originalQuery = res.cloud.concept[0];
                }

                // Fetch the suggestions
                _.each(res.cloud.i, function(row) {
                    if (row._) {

                        // Replace the existing query in the parameters query
                        params.q = row._;

                        var label = params.q;
                        var url = qs.stringify(params);

                        // Create a new suggestion model
                        var suggestionModel = new ResultsModel.Suggestion(label, url);
                        suggestedItems.push(suggestionModel);
                    }
                });

                // Return the suggestions
                var suggestionsModel = new ResultsModel.Suggestions(originalQuery, suggestedItems);
                return callback(null, suggestionsModel);
            });

        } catch(error) {
            log().error(error);
            return callback('An error occurred while fetching Aquabrowser data');
        }
    });
};