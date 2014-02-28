//Global variables only change base url. NEVER leave a trailing /
var baseUrl = 'http://localhost:5000'; //'http://staging.osf.io';
var protocol = 'http://';
//Dont change anything past here
var linkToGo = ['/', '/ih6zf/'];
var visited = [];
var resources = [];
var ajaxes = [];
var branches = [];
var files = [];
var index = 0;

var spider = require('casper').create({
    pageSettings: {
        loadPlugins: false
    } //,
    //verbose: true,
    //logLevel: 'debug'
});
var fs = require('fs');


function getCli() {
    if (spider.cli.has('server'))
        baseUrl = spider.cli.get('server');
    if (spider.cli.has('s'))
        baseUrl = spider.cli.get('s');
    if (spider.cli.has('k'))
        procUrls = true;
}

function stripLinks(url) {
    var links = document.querySelectorAll('a');
    return Array.prototype.map.call(links, function(e) {
        if (!e.getAttribute('download')) {
            if (e.getAttribute('href') && e.getAttribute('href').charAt(0) === '?')
                return url + e.getAttribute('href');
            return e.getAttribute('href');
        }
        return null;
    });
}

function processLinks(links) {
    filtered = links.filter(function(element, position) {
        return element != null && links.indexOf(element) == position && element.charAt(0) == '/' && linkToGo.indexOf(element) == -1 && visited.indexOf(element) == -1 && element.indexOf('#') == -1 && element.indexOf('download') == -1;
    });

    linkToGo = linkToGo.concat(filtered);
}

function grab(url) {
    this.then(function() {
        var linklist = this.evaluate(stripLinks, linkToGo[index]);
        if (linklist) {
            processLinks(linklist);
        }
    });
}

function clickThings() {
    this.echo('\tClicking things...');
    this.then(function() {
        var rv, i = 0;
        var count = this.evaluate(function() {
            return $('.github-branch-select option').length;
        });


        do {
            do {
                rv = this.evaluate(function() {
                    if ($('.hg-expand').length > 0) {
                        $('.hg-expand').click();
                        return true;
                    }
                    return false
                });
                if(rv)
                    this.wait(2000);
            } while (rv);
            i = this.evaluate(function(n) {
                $('.github-branch-select').val($('.github-branch-select option')[n].value);
                $('.github-branch-select').change();
                return n + 1;
            }, i);
            this.wait(2000);
        } while (i < count);
        this.echo('\tFinished Clicking');
    });

}

function getHgridUrls() {
    this.then(function() {
        links = this.evaluate(function() {
            if (filebrowser) {
                links = filebrowser.grid.getData().map(function(e) {
                    return e.urls.view;
                });
                links = links.filter(function(e, p) {
                    return e != null
                });
                return links;
            }
            return false;
        });
        if (links) {
            this.echo('\tFound ' + links.length + ' links from Hgrid.')
            linkToGo = linkToGo.concat(links);
        }
    });
}

spider.on('resource.received', function(resource) {
    resources.push(resource.url);
});

function cleanResources() {
    resources = resources.filter(function(e,p) {
        return resources.indexOf(e) == p && e.indexOf(baseUrl) != -1;
    });
}

function cleanVisted() {
    visited = visited.map(function(e) {
        return baseUrl + e;
    });
}
//Here lives the big daddy driver function

function toSpiderOrNotToSpider() {
    if (linkToGo[index]) {

        if (visited.indexOf(linkToGo[index]) != -1) {
            index++;
            this.run(toSpiderOrNotToSpider);
        }
        this.echo('Crawling ' + baseUrl + linkToGo[index] + '(' + index + '/' + linkToGo.length + ')');
        this.start(baseUrl + linkToGo[index]);
        grab.call(this, linkToGo[index]);
        clickThings.call(this);
        getHgridUrls.call(this);
        visited.push(linkToGo[index]);
        this.then(function() {
            index++
        });
        this.run(toSpiderOrNotToSpider);
    } else {
        cleanResources.call(this);
        cleanVisted.call(this);
        mirrorable.write(visited.join('\n'));
        mirrorable.write('\n');
        mirrorable.write(resources.join('\n'));
        this.echo('Found ' + visited.length + ' links.');
        mirrorable.close();
        this.exit();
    }
}

//////////////Execution begins here/////////////////
getCli();
var domain = baseUrl.replace(protocol, '');
//Creating the base directory
var mirrorable = fs.open('mirrorable.txt', 'w');

spider.start().then(function() {
    this.echo('===============');
    this.echo('Spider started.');
    this.echo('===============\n');
});

//Lift off!
spider.run(toSpiderOrNotToSpider);
