Ajax-mirror
===========

A casperjs script for cloning ajax and javascript heavy websites for offline viewing.

Uses [mockjax](https://github.com/appendto/jquery-mockjax) to mock ajax calls to local JSON.

Currently about 90% working.

###Searching
Create a [custom google search](https://www.google.com/cse/create/new) and make note of your 'cx.'
Open search/index.html and insert your cx into the `var cx=...` statement.

###404 Pages
Rename htaccess to .htaccess and place it along with 404.html into your root www/ directory.

###ToDo
* Async
* faster
* resume?
* Disable buttons?
* code review/cleanup
* Search does not work.
* github branches
    - Just the issue with dashboard

###Done
* not clones pages with #'s
    - ie: index.html#somesection
* Emebedded youtube
* stop downloading files
* folder Naming
* FauxJax still catching html
* Url params
* create one FauxJax file?
    - would be worse...
* better way to pull page source
    - Doesn't seem to be a better way
* FauxJax double listing
* Inject readonly flag
* Strip piwik
* Stripping facebook and google analytics?

Usage:
```
$capserjs Ajax-mirror.js --web-security=no
$wget -x -i mirrorable.txt
```

Target site defaults to localhost:5000

Set target either in file or with --s=http://example.com 
                            or --server=http://example.com

run with k, `casperjs Ajax-mirror.js k`, to convert links to the current working directory.

Notes:
* Embedded youtube not working
* This script is currently site specific.
    - It may however work for other sites.
* The script sometimes randomly freezes on the first couple pages.
    - clearing the directory and restarting the script seems to fix this.
* requires access to the filebrowser object
