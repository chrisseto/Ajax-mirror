//Global variables only change base url. NEVER leave a trailing /
var baseUrl = 'http://localhost:5000';
var protocol = 'http://'
//Dont change anything past here
var linkToGo = ['/'];
var visited = [];
var resources = [];
var ajaxes = [];
var index = 0;

//Constants
var spider = require('casper').create();
var fs = require('fs');
var getDirectory = /^(.+)\/([^\/]+)$/;
var stripUrlParams = /(.+?)(\?.*)$/;
// /vars

function saveResources() {
    spider.echo('Saving resources...');
    for (var i = 0; i < resources.length; i++) {
        this.download(resources[i], resources[i].replace(/^(?:\/\/|[^\/]+)*\//, "./"));
        spider.echo('Saved ' + resources[i] + ' (' + (i + 1) + '/' + resources.length + ')');
    }
    spider.echo('Finished saving resources.');
}

function stripLinks() {
    var links = document.querySelectorAll('a');
    return Array.prototype.map.call(links, function(e) {
        return e.getAttribute('href');
    });
}

function cleanLinks(links) {
    return links.filter(function(element, position) {
        return links.indexOf(element) == position && element.charAt(0) == '/';
    });
}

function processLinks(links) {
    filtered = links.filter(function(element, position) {
        return links.indexOf(element) == position && element.charAt(0) == '/' && linkToGo.indexOf(element) == -1 && visited.indexOf(element) == -1;
    });

    linkToGo = linkToGo.concat(filtered);
}

function grab(url) {
    this.then(function() {
        var linklist = this.evaluate(stripLinks);
        if (linklist) {
            processLinks(linklist);
        }
    });
}

function parseUrl(url) {
    var matches = /^(.+:\/\/)(.+?)\/(.*)$/.exec(url);
    protocol = matches[1];
    domain = matches[2];
}

function getSaveName(url) {
    url = url.replace(baseUrl, '');
    if (url.charAt(url.length - 1) === '/')
        url += 'index.html';
    else
        url += '.html';
    this.echo('Saving as .' + url);
    return '.' + url;
}

function clone() {
    this.getUrl = baseUrl + linkToGo[index];

    this.then(function() {

        var html = fs.open(getSaveName.call(this, this.getUrl), 'w');
        var src = this.evaluate(function(url) {
            return __utils__.sendAJAX(url);
        }, this.getUrl);

        src = src.replace(/\"(?:\/\/|["\/]+)*\//g, '"' + fs.workingDirectory + '/');
        html.write(src);

        if (buildFauxJax.call(this))
            html.write('<script src="' + fs.workingDirectory + '/static/js/jquery.mockjax.js"></script>\n<script src="./fauxJax.js"></script>');

        html.close();
    });
}

function buildFauxJax() {
    this.echo('Mocking AJAX...')
    if (ajaxes.length > 0) {
        var fauxJax = fs.open('.' + linkToGo[index] + 'fauxJax.js', 'w');

        fauxJax.write('(function() {\n');

        for (var i = 0; i < ajaxes.length; i++) {
            this.echo('Mocking request to ' + ajaxes[i] + ' (' + (i + 1) + '/' + ajaxes.length + ')');
            fauxJax.write('$.mockjax({\nurl: \'' + ajaxes[i] + '\',\ndataType: \'json\',\nresponseText: ');

            fauxJax.write(this.evaluate(function(ajax) {
                return __utils__.sendAJAX(ajax);
            }, ajaxes[i]));

            fauxJax.write('\n});');
        }

        fauxJax.write('})();');
        fauxJax.close();
        ajaxes = [];
        this.echo('Finished mocking.')
        return true;
    }
    this.echo('Finished mocking.')
    return false;
};

spider.on('resource.requested', function(resource) {

    resource.url = resource.url.replace(stripUrlParams, '$1');
    if (resource.url != baseUrl + linkToGo[index] && resource.url.indexOf(baseUrl) != -1) {

        if (resource.url.indexOf('.') == -1 && resource.url != baseUrl + linkToGo[index] && ajaxes.indexOf(resource.url.replace(baseUrl, '')) == -1) {
            resource.url = resource.url.replace(baseUrl, '');
            ajaxes.push(resource.url);
            this.echo('Pushed ' + resource.url + ' to ajax queue.');
        } else if (resources.indexOf(resource.url) == -1) {
            resources.push(resource.url);
        }
    }
});

//Here lives the big daddy driver function

function toSpiderOrNotToSpider() {
    if (linkToGo[index]) {

        if (visited.indexOf(linkToGo[index]) != -1) {
            index++;
            this.run(toSpiderOrNotToSpider);
        }
        this.echo('Crawling ' + baseUrl + linkToGo[index]);
        this.start(baseUrl + linkToGo[index]);
        grab.call(this, linkToGo[index]);
        clone.call(this);
        visited.push(linkToGo[index]);
        this.then(function(){index++});
        this.run(toSpiderOrNotToSpider);
    } else {
        saveResources.call(this);
        this.echo('Found ' + visited.length + ' links.');
        this.echo(' - ' + visited.join('\n - '));
        this.echo('Caught ' + resources.length + ' resources.');
        this.echo(' - ' + resources.join('\n - '));
        this.exit();
    }
}

//////////////Execution begins here/////////////////
var domain = baseUrl.replace(protocol, '');
//Creating the base directory
if (!fs.exists(domain))
    fs.makeDirectory(domain);
fs.changeWorkingDirectory(domain);

spider.start().then(function() {
    this.echo('===============');
    this.echo('Spider started.');
    this.echo('===============\n');
});

//Lift off!
spider.run(toSpiderOrNotToSpider);
