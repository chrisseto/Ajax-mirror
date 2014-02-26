//Global variables only change base url. NEVER leave a trailing /
var baseUrl = 'http://localhost:5000'; //'http://staging.osf.io';
var protocol = 'http://';
//Dont change anything past here
var linkToGo = ['/', '/ih6zf/'];
var visited = [];
var resources = [];
var ajaxes = [];
var files = [];
var index = 0;
var procUrls = false;
var additionalFiles = [
    ['https://raw.github.com/appendto/jquery-mockjax/master/jquery.mockjax.js', 'static/js/jquery.mockjax.js']
];

//Constants
var spider = require('casper').create({
    pageSettings: {
        loadPlugins: false
    } //,
    //verbose: true,
    //logLevel: 'debug'
});
var fs = require('fs');
var getDirectory = /^(.+)\/([^\/]+)$/;
var stripUrlParams = /(.+?)(\?.*)$/;
// /vars

function getCli() {
    if (spider.cli.has('server'))
        baseUrl = spider.cli.get('server');
    if (spider.cli.has('s'))
        baseUrl = spider.cli.get('s');
    if (spider.cli.has('k'))
        procUrls = true;
}

function saveResources() {
    spider.echo('Saving resources...');
    for (var i = 0; i < resources.length; i++) {
        this.download(resources[i], resources[i].replace(/^(?:\/\/|[^\/]+)*\//, "./"));
        spider.echo('Saved ' + resources[i] + ' (' + (i + 1) + '/' + resources.length + ')');
    }
    spider.echo('Finished saving resources.');
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
        return element != null && links.indexOf(element) == position && element.charAt(0) == '/' && linkToGo.indexOf(element) == -1 && visited.indexOf(element) == -1 && element.indexOf('#') == -1;
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
        url += '/index.html';
    this.echo('\tSaving as .' + url);
    return '.' + url;
}

function clickThings() {
    this.echo('\tClicking expand elements...');
    this.then(function() {
        var rv;
        do {
            rv = this.evaluate(function() {
                if ($('.hg-expand').length > 0) {
                    $('.hg-expand').click();
                    return true;
                }
                return false
            });
            if (rv)
                this.wait(5000);
        } while (rv);

    });
    this.echo('\tFinished Clicking');
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

function get404() {
    this.echo('Building 404 Page.')
    var getUrl = baseUrl + '/404.html';
    this.thenOpen(getUrl, function() {

        var html = fs.open('./404.html', 'w');
        var src = this.getContent();

        src = src.replace('This site is running in development mode.', 'This site is a read-only static mirror.');
        if (procUrls)
            src = src.replace(/(href=")(\/[^\/])/g, '$1' + fs.workingDirectory + '$2');
        html.write(src);
        html.close();
    });
}

function clone() {
    this.getUrl = decodeURI(baseUrl + linkToGo[index]);

    this.then(function() {
        var src = this.evaluate(function(url) {
            return __utils__.sendAJAX(url);
        }, this.getUrl);

        if (src.indexOf('data-http-status-code="404"') == -1) {

            var html = fs.open(getSaveName.call(this, this.getUrl), 'w');

            if (this.getUrl.indexOf('?') == -1)
                src = src.replace(/(href=")(\?)/g, '$1./%3f');
            else
                src = src.replace(/(href=")(\?)/g, '$1../%3f');

            src = src.replace('This site is running in development mode.', 'This site is a read-only static mirror.');

            if (procUrls)
                src = src.replace(/(href=")(\/[^\/])/g, '$1' + fs.workingDirectory + '$2');

            var i = src.indexOf('</head>');
            html.write(src.slice(0, i));

            if (buildFauxJax.call(this))
                if (procUrls)
                    html.write('\n<script src="' + fs.workingDirectory + '/static/js/jquery.mockjax.js"></script>\n<script src="./fauxJax.js"></script>\n');
                else
                    html.write('\n<script src="/static/js/jquery.mockjax.js"></script>\n<script src="./fauxJax.js"></script>\n');

            html.write(src.slice(i));
            html.close();
        }
    });
}

function getAdditionalFiles() {
    for (var i = 0; i < additionalFiles.length; i++) {
        this.download(additionalFiles[i][0], additionalFiles[i][1]);
    }
}

function buildFauxJax() {
    if (ajaxes.length > 0) {
        this.echo('\tMocking AJAX...')
        var saveUrl = '.' + linkToGo[index];
        if (saveUrl.charAt(saveUrl.length - 1) != '/')
            saveUrl += '/';
        saveUrl += 'fauxJax.js';
        var fauxJax = fs.open(saveUrl, 'w');

        fauxJax.write('(function() {\n');

        for (var i = 0; i < ajaxes.length; i++) {
            this.echo('\t\tMocking request to ' + decodeURI(ajaxes[i]) + ' (' + (i + 1) + '/' + ajaxes.length + ')');
            fauxJax.write('$.mockjax({\nurl: \'' + decodeURI(ajaxes[i]) + '\',\ndataType: \'json\',\nresponseText: ');

            fauxJax.write(this.evaluate(function(ajax) {
                return __utils__.sendAJAX(ajax);
            }, ajaxes[i]));

            fauxJax.write('\n});');
        }

        fauxJax.write('})();');
        fauxJax.close();
        ajaxes = [];
        this.echo('\tFinished mocking.')
        return true;
    }
    return false;
};

spider.on('resource.received', function(resource) {
    if (resource.url != this.getCurrentUrl() && resource.contentType.indexOf('html') === -1) {
        resource.url = resource.url.replace(stripUrlParams, '$1');
        if (linkToGo.indexOf(resource.url.replace(baseUrl, '')) == -1 && resource.url.indexOf(baseUrl) != -1) {

            if (resource.url.indexOf('.') == -1 && resource.url != baseUrl + linkToGo[index] && ajaxes.indexOf(resource.url.replace(baseUrl, '')) == -1) {
                resource.url = resource.url.replace(baseUrl, '');
                ajaxes.push(resource.url);
                this.echo('\tPushed ' + resource.url + ' to ajax queue.');
            } else if (resources.indexOf(resource.url) == -1 && resource.url.charAt(resource.url.length - 1) != '/') {
                resources.push(resource.url);
            }
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
        this.echo('Crawling ' + baseUrl + linkToGo[index] + '(' + index + '/' + linkToGo.length + ')');
        this.start(baseUrl + linkToGo[index]);
        grab.call(this, linkToGo[index]);
        clickThings.call(this);
        getHgridUrls.call(this);
        clone.call(this);
        visited.push(linkToGo[index]);
        this.then(function() {
            index++
        });
        this.run(toSpiderOrNotToSpider);
    } else {
        saveResources.call(this);
        get404.call(this);
        getAdditionalFiles.call(this);
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
