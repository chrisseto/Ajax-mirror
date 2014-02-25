Ajax-mirror
===========

A casperjs script for cloning ajax and javascript heavy websites for offline viewing.

Uses [mockjax](https://github.com/appendto/jquery-mockjax) to mock ajax calls to local JSON.

Currently about 70% working.

Note: 

###ToDo
* Async
* stablity testing
* faster
* better way to pull page source
    - grab page source from resources, first thing loaded
* resume?
* build 404 file
    - Generate .htaccess?
* Disable buttons?
* cloning redirects
* code review/cleanup
* FauxJax still catching html
* create one FauxJax file?
    - Might be better might be worse...
* Url params

###Done
* not clones pages with #'s
    - ie: index.html#somesection
* Emebedded youtube
* stop downloading files
* folder Naming

Usage:
```
$capserjs Ajax-mirror.js
```

Target site defaults to localhost:5000

Set target either in file or with --s=http://example.com 
                            or --server=http://example.com

run with k, `casperjs Ajax-mirror.js k`, to convert links to the current working directory.

Notes:
* Embedded youtube not working
* This script is currently site specific, I'll change that soon.
    - It may however work for other sites.
* The script sometimes randomly freezes on the first couple pages.
    - clearing the directory and restarting the script seems to fix this.
