NodeSession
===========

Since HTTP driven applications are stateless, sessions provide a way to store information about the user across requests.
NodeSession ships with a variety of session back-ends available for use through a clean, unified API. Support for
back-ends such as File and databases is included out of the box.

[![npm version](https://badge.fury.io/js/node-session.svg)](http://badge.fury.io/js/node-session)
[![Build Status](https://travis-ci.org/quorrajs/NodeSession.svg?branch=master)](https://travis-ci.org/quorrajs/NodeSession)
[![Quality](https://codeclimate.com/github/quorrajs/NodeSession/badges/gpa.svg)](https://codeclimate.com/github/quorrajs/NodeSession)

- [Installation](#installation)
- [Session Usage](#session-usage)
- [Configuration](#configuration)
- [Flash Data](#flash-data)
- [CSRF Token](#csrf-token)
- [Database Sessions](#database-sessions)
- [Session Drivers](#session-drivers)

## Installation

The source is available for download from [GitHub](https://github.com/quorrajs/NodeSession). Alternatively, you
can install using Node Package Manager (npm):

```javascript
npm install node-session
```
## Session Usage

**Initialization**

```javascript
var NodeSession = require('node-session');

// init
session = new NodeSession({secret: 'Q3UBzdH9GEfiRCTKbi5MTPyChpzXLsTD'});

// start session for an http request - response
// this will define a session property to the request object
session.startSession(req, res, callback)

```

**Accessing sessions**

The session can be accessed via the HTTP request's session property.

**Storing An Item In The Session**

```javascript
req.session.put('key', 'value');
```

**Push A Value Onto An Array Session Value**

```javascript
req.session.push('user.teams', 'developers');
```

**Retrieving An Item From The Session**

```javascript
var value = req.session.get('key');
```

**Retrieving An Item Or Returning A Default Value**

```javascript
var value = req.session.get('key', 'default');
```

**Retrieving An Item And Forgetting It**

```javascript
var value = req.session.pull('key', 'default');
```

**Retrieving All Data From The Session**

```javascript
var data = req.session.all();
```

**Determining If An Item Exists In The Session**

```javascript
if (req.session.has('users'))
{
    //
}
```

**Removing An Item From The Session**

```javascript
req.session.forget('key');
```

**Removing All Items From The Session**

```javascript
req.session.flush();
```

**Regenerating The Session ID**

```javascript
req.session.regenerate();
```


## Flash Data

Sometimes you may wish to store items in the session only for the next request. You may do so using the
`req.session.flash` method:

```javascript
req.session.flash('key', 'value');
```

**Reflashing The Current Flash Data For Another Request**

```javascript
req.session.reflash();
```

**Reflashing Only A Subset Of Flash Data**

```javascript
req.session.keep('username', 'email');
```


## CSRF Token

By default NodeSession generates and keeps CSRF token for your application in session.
 
**Access CSRF token**

```javascript
req.session.getToken()
```

**Regenerate CSRF token**

```javascript
req.session.regenerateToken()
```


## configuration

Configuration options are passed during initialization of NodeSession module as an object. NodeSession supports following configuration
options.

```javascript
{
    /*
    |--------------------------------------------------------------------------
    | Encryption secret
    |--------------------------------------------------------------------------
    |
    | This secret key is used by the NodeSession to encrypt session and sign cookies
    | etc. This should be set to a random, 32 character string, otherwise these
    | encrypted strings will not be safe.
    |
    */

    'secret': 'Q3UBzdH9GEfiRCTKbi5MTPyChpzXLsTD'

    /*
     |--------------------------------------------------------------------------
     | Default Session Driver
     |--------------------------------------------------------------------------
     |
     | This option controls the default session "driver" that will be used on
     | requests. By default, NodeSession will use the lightweight file driver but
     | you may specify any of the other wonderful drivers provided here.
     |
     | Supported: "memory", "file", "database"
     |
     */

    'driver': 'file',

    /*
     |--------------------------------------------------------------------------
     | Session Lifetime
     |--------------------------------------------------------------------------
     |
     | Here you may specify the number of milli seconds that you wish the session
     | to be allowed to remain idle before it expires. If you want them
     | to immediately expire on the browser closing, set that option.
     |
     | Default lifetime value: 300000
     | Default expireOnClose value: false
     |
     */

    'lifetime': 300000, // 5 minutes

    'expireOnClose': false,



    /*
     |--------------------------------------------------------------------------
     | Session File Location
     |--------------------------------------------------------------------------
     |
     | When using the file session driver, we need a location where session
     | files may be stored. By default NodeSession will use the location shown here
     | but a different location may be specified. This is only needed for
     | file sessions.
     |
     */

    'files': process.cwd() + '/sessions',

    /*
     |--------------------------------------------------------------------------
     | Session Database Connection
     |--------------------------------------------------------------------------
     |
     | When using the "database" session driver, you may specify a connection that
     | should be used to manage these sessions.
     |
     | NodeSession uses Nodejs Waterline module for database interactions, hence
     | it supports all databases supported by waterline. Before you specify a
     | waterline adapter with your connection make sure that you have installed
     | it in your application.
     |
     | For example before using sail-mong adapter
     | Run:
     | npm install sails-mongo
     |
     */

    'connection': {
        'adapter': 'sails-mongo',
        'host': 'localhost',
        'port': 27017,
        'user': 'tron',
        'password': '',
        'database': 'tron'
    },

    /*
     |--------------------------------------------------------------------------
     | Session Database Table
     |--------------------------------------------------------------------------
     |
     | When using the "database" session driver, you may specify the table we
     | should use to manage the sessions. Of course, NodeSession uses `sessions`
     | by default; however, you are free to change this as needed.
     |
     */

    'table': 'sessions',

    /*
     |--------------------------------------------------------------------------
     | Session Sweeping Lottery
     |--------------------------------------------------------------------------
     |
     | Some session drivers must manually sweep their storage location to get
     | rid of old sessions from storage. Here are the chances that it will
     | happen on a given request. By default, the odds are 2 out of 100.
     |
     */

    'lottery': [2, 100],

    /*
     |--------------------------------------------------------------------------
     | Session Cookie Name
     |--------------------------------------------------------------------------
     |
     | Here you may change the name of the cookie used to identify a session
     | instance by ID. The name specified here will get used every time a
     | new session cookie is created by the NodeSession for every driver.
     |
     | default: 'node_session'
     |
     */

    'cookie': 'node_session',

    /*
     |--------------------------------------------------------------------------
     | Session Cookie Path
     |--------------------------------------------------------------------------
     |
     | The session cookie path determines the path for which the cookie will
     | be regarded as available. Typically, this will be the root path of
     | your application but you are free to change this when necessary.
     |
     | default: '/'
     |
     */

    'path': '/',

    /*
     |--------------------------------------------------------------------------
     | Session Cookie Domain
     |--------------------------------------------------------------------------
     |
     | Here you may change the domain of the cookie used to identify a session
     | in your application. This will determine which domains the cookie is
     | available to in your application.
     |
     | default: null
     |
     */

    'domain': null,

    /*
     |--------------------------------------------------------------------------
     | HTTPS Only Cookies
     |--------------------------------------------------------------------------
     |
     | By setting this option to true, session cookies will only be sent back
     | to the server if the browser has a HTTPS connection. This will keep
     | the cookie from being sent to you if it can not be done securely.
     |
     | default: false
     |
     */

    'secure': false

    /**
    |-----------------------------------------------------------------------------
    | Encrypt session
    |-----------------------------------------------------------------------------
    |
    | If you need all stored session data to be encrypted, set the encrypt
    | configuration option to true.
    |
    | default: false
    |
    */

    'encrypt': false
}
```

The NodeSession uses the flash session key internally, so you should not add an item to the session by that name.


## Database Sessions

When using the database session driver, you may need to setup a table to contain the session items based on database.
Below is a required schema for the table:

| filed        | type    | index  |
|--------------|---------|--------|
| id           | string  | unique |
| payload      | string  |        |
| lastActivity | integer |        |


## Session Drivers

The session "driver" defines where session data will be stored for each request. NodeSession ships with several great
drivers out of the box:

- memory - sessions will be stored in memory. Memory session driver is purposely not designed for a production
environment. It will leak memory under most conditions, does not scale past a single process, and is meant for
debugging and developing.
- file - sessions will be stored in files in a specified location.
- database - sessions will be stored in a database.

## To do

- Add redis session driver

## License

The NodeSession is open-sourced software licensed under the [MIT license](http://opensource.org/licenses/MIT).

