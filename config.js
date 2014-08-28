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

var bunyan = require('bunyan');

var config = module.exports = require('./config_private');

// Set the temporary files directory
var tmpDir = process.env.TMP || process.env.TMPDIR || process.env.TEMP || '/tmp' || process.cwd();

/**
 * `config.app`
 *
 * @param  {String}     hostname        The application host
 * @param  {String}     root            The application root
 * @param  {String}     title           The application title
 * @param  {String}     ui              The path to the static files
 */
config.app = {
    'hostname': 'libraries-gateway.cam.ac.uk',
    'root': __dirname,
    'title': 'Cambridge Libraries',
    'ui': __dirname + '/public'
};

/**
 * `config.files`
 *
 * @param  {String}    tmpDir           The directory where temporary files can be created
 */
config.files = {
    'tmpDir': tmpDir
};

/**
 * `config.server`
 *
 * @param  {String}     host
 * @param  {Number}     port            The network port on which the application can be accessed
 * @param  {String}     protocol
 */
config.server = {
    'host': 'localhost',
    'port': 5000,
    'protocol': 'http'
};

/**
 * `config.log`
 *
 * @param  {Stream[]}   streams         The Bunyan streams
 * @param  {Object}     serializers     The Bunyan serializers
 */
config.logger = {
    'streams': [
        {
            'level': 'info',
            'path': 'server.log'
        }
    ],
    'serializers': {
        'err': bunyan.stdSerializers.err,
        'req': bunyan.stdSerializers.req,
        'res': bunyan.stdSerializers.res
    }
};

/**
 * `config.nodes`
 */
config.constants = {

    // The alphabet
    'alphabet': ['a','b','c','d','e','f','g','h','i','j','k','l','m','n','o','p','q','r','s','t','u','v','w','x','y','z'],

    // Search API's
    'engines': {
        'aquabrowser': {
            'timeout': 5000,
            'uri': 'http://search.lib.cam.ac.uk/result.ashx',
            'uri_availability': 'http://search.lib.cam.ac.uk/availability.ashx',
            'uri_facets': 'http://search.lib.cam.ac.uk/RefinePanel.ashx',
            'uri_suggestions': 'http://search.lib.cam.ac.uk/AquaServer.ashx'
        },
        'summon': {
            'timeout': 10000,
            'uri': 'api.summon.serialssolutions.com',
            'version': '/2.0.0/search'
        }
    },

    // Available formats (search)
    'contenttypes': {

        // Formats that are displayed in the search dropdown
        'Book': {
            'displayInSearch': true,
            'displayName': 'Books',
            'summon': 'Book'
        },
        'eBook': {
            'displayInSearch': true,
            'displayName': 'eBook',
            'summon': 'eBook'
        },
        'eJournal': {
            'displayInSearch': true,
            'displayName': 'eJournal',
            'summon': 'eJournal'
        },
        'Manuscript': {
            'displayInSearch': true,
            'summon': 'Manuscript'
        },
        'Journal Article': {
            'displayInSearch': true,
            'summon': 'Journal Article'
        },
        'Paper': {
            'displayInSearch': true,
            'summon': 'Paper'
        }
    },

    // Summon disciplines
    'disciplines': [
        "Agriculture",
        "Anatomy & Physiology",
        "Anthropology",
        "Applied Sciences",
        "Architecture",
        "Astronomy & Astrophysics",
        "Biology",
        "Botany",
        "Business",
        "Chemistry",
        "Computer Science",
        "Dance",
        "Dentistry",
        "Diet & Clinical Nutrition",
        "Drama",
        "Ecology",
        "Economics",
        "Education",
        "Engineering",
        "Environmental Sciences",
        "Film",
        "Forestry",
        "Geography",
        "Geology",
        "Government",
        "History",
        "History & Archaeology",
        "International Relations",
        "Journalism & Communications",
        "Languages & Literatures",
        "Law",
        "Library & Information Science",
        "Mathematics",
        "Medicine",
        "Meteorology & Climatology",
        "Military & Naval Science",
        "Music",
        "Nursing",
        "Occupational Therapy & Rehabilitation",
        "Oceanography",
        "Parapsychology & Occult Sciences",
        "Pharmacy, Therapeutics, & Pharmacology",
        "Philosophy",
        "Physical Therapy",
        "Physics",
        "Political Science",
        "Psychology",
        "Public Health",
        "Recreation & Sports",
        "Religion",
        "Sciences",
        "Social Sciences",
        "Social Welfare & Social Work",
        "Sociology & Social History",
        "Statistics",
        "Veterinary Medicine",
        "Visual Arts",
        "Women's Studies",
        "Zoology"
    ]
};

/**
 * `config.nodes`
 */
config.nodes = {

    // Home
    'home': {
        'title': 'Home',
        'link': '',
        'inNavigation': true,
        'settings': {
            'twitter': {
                'timeout': 4000,
                'tweet_expiration': 900000
            }
        }
    },

    // Find a resource
    'find-a-resource': {
        'title': 'Find a resource',
        'link': 'find-a-resource',
        'inNavigation': true,
        'settings': {
            'minTagValue': 10,
            'numberOfHoldingsShown': 3,
            'pageLimit': 40
        }
    },

    // Find a library
    'find-a-library': {
        'title': 'Find a library',
        'link': 'find-a-library',
        'inNavigation': true,
        'settings': {
            'ranges': [
                {'value': 0.25, 'label': 'Within 1/4 mile'},
                {'value': 0.5, 'label': 'Within 1/2 mile'},
                {'value': 1, 'label': 'Within 1 mile'},
                {'value': 2, 'label': 'Within 2 miles'}
            ]
        }
    },

    // Using our libraries
    'using-our-libraries': {
        'title': 'Using our libraries',
        'link': 'using-our-libraries',
        'inNavigation': true,
        'settings': {}
    },

    // My account
    'my-account': {
        'title': 'My account',
        'link': 'my-account',
        'inNavigation': true,
        'settings': {}
    },

    // Library blogs
    'blogs': {
        'title': 'Blogs',
        'link': 'blogs',
        'inNavigation': false,
        'settings': {
            'expiration': 900000,
            'itemsPerPage': 10,
            'url': 'http://mix.chimpfeedr.com/1dc9c-cam-blogs-01Nov13'
        }
    }
};
