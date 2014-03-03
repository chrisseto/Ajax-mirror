//Global variables only change base url. NEVER leave a trailing /
var baseUrl = 'http://localhost:5000'; //'http://staging.osf.io';
var protocol = 'http://';
//Dont change anything past here
var linkToGo = ['/', '/ih6zf/'];
var visited = [];
var resources = [];
var index = 0;
var fixCache = /^(.+)(\?_=\d+|\?\d+)/;
var projectApi = /^.*api\/v1\/project\/\w+\/$/;
var fileDumpUrl = 'files/urls/';
var fs = require('fs');
var verbose = false;

var spider = require('casper').create({
    pageSettings: {
        loadPlugins: false
    }
});


function getCli() {
    if (spider.cli.has('server'))
        baseUrl = spider.cli.get('server');
    if (spider.cli.has('s'))
        baseUrl = spider.cli.get('s');
    if (spider.cli.has('v') || spider.cli.has('verbose'))
        verbose = true;
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

spider.on('resource.received', function(resource) {
    //TODO Parse for file or trailing /
    resource.url = resource.url.replace(fixCache, '$1');
    if (resources.indexOf(resource.url) == -1 && resource.url.indexOf(baseUrl) != -1) {
        resources.push(resource.url);

        if(verbose)
            mirrorable.write(resource.url + '\n');
        else
            this.echo(resource.url);

        if (projectApi.exec(resource.url))
            grabHgrid.call(this, resource.url);
    }
});

function grabHgrid(url) {
    var urls = JSON.parse(this.evaluate(function(url) {
        return __utils__.sendAJAX(url);
    }, url + fileDumpUrl));
    linkToGo = linkToGo.concat(urls);
    urls = urls.map(function(e, p) {
        return baseUrl + e;
    });
    resources = resources.concat(urls);

    if (verbose) {
        mirrorable.write(urls.join('\n'));
        mirrorable.flush();
    }
    else
        this.echo(urls.join('\n'));

}

//Here lives the big daddy driver function

function toSpiderOrNotToSpider() {
    if (linkToGo[index]) {

        if (visited.indexOf(linkToGo[index]) != -1) {
            index++;
            this.run(toSpiderOrNotToSpider);
        }
        if (verbose)
            this.echo('Crawling ' + baseUrl + linkToGo[index] + '(' + index + '/' + linkToGo.length + ')');
        this.start(baseUrl + linkToGo[index]);
        grab.call(this, linkToGo[index]);
        visited.push(linkToGo[index]);
        this.then(function() {
            index++
        });
        this.run(toSpiderOrNotToSpider);
    } else {
        if(verbose) {
            this.echo('Found ' + resources.length + ' links.');
            mirrorable.close();
        }
        this.exit();
    }
}

//////////////Execution begins here/////////////////
getCli();
var domain = baseUrl.replace(protocol, '');
if (verbose)
    var mirrorable = fs.open('mirrorable.txt', 'w');
var saveable = /.*((\/|\?.*)|\..*)$/; //For use later add baseurl to front
spider.timeout = 3000;

spider.start().then(function(){});
//Lift off!
spider.run(toSpiderOrNotToSpider);
