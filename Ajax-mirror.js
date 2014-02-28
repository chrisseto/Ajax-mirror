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
var procUrls = false;
var additionalFiles = [
    ['https://raw.github.com/appendto/jquery-mockjax/master/jquery.mockjax.js', 'static/js/jquery.mockjax.js']
];
var ignoreFiles = [
    'piwik',
    'prum',

]
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
var notFile = /^(?:http|https):\/\/.+?\/[^\.]+$/;
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

function clone() {
    this.getUrl = decodeURI(baseUrl + linkToGo[index]);

    this.then(function() {
        var src = this.evaluate(function(url) {
            return __utils__.sendAJAX(url);
        }, this.getUrl);

        if (src && src.indexOf('data-http-status-code="404"') == -1) {

            var html = fs.open(getSaveName.call(this, this.getUrl), 'w');

            if (this.getUrl.indexOf('?') == -1)
                src = src.replace(/(href=")(\?)/g, '$1./%3f');
            else
                src = src.replace(/(href=")(\?)/g, '$1../%3f');

            if (procUrls)
                src = src.replace(/(href=")(\/[^\/])/g, '$1' + fs.workingDirectory + '$2');

            var i = src.indexOf('</head>');
            html.write(src.slice(0, i));

            if (buildFauxJax.call(this))
                if (procUrls)
                    html.write('\n<script src="' + fs.workingDirectory + '/static/js/jquery.mockjax.js"></script>\n<script src="./fauxJax.js"></script>\n');
                else
                    html.write('\n<script src="/static/js/jquery.mockjax.js"></script>\n<script src="./fauxJax.js"></script>\n');

            var n = src.indexOf('<body>') + 7;

            html.write(src.slice(i, n));
            html.write('<style>#mirror {position:fixed;bottom:0;left:0;border-top-right-radius:8px;background-color:red;color:white;padding:.5em;}</style>');
            html.write('<div id="mirror"><strong>WARNING</strong>: This site is a static read-only mirror.</div>');
            html.write(src.slice(n));

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
            if (ajaxes[i].indexOf('github') == -1)
                fauxJax.write('$.mockjax({\nurl: /' + decodeURI(ajaxes[i]).replace(stripUrlParams, '$1').replace(/\//g, '\\/') + '(\\?.*|$)/,\ndataType: \'json\',\nresponseText: ');
            else
                fauxJax.write('$.mockjax({\nurl: \'' + decodeURI(ajaxes[i]) + '\',\ndataType: \'json\',\nresponseText: ');
            fauxJax.write(this.evaluate(function(ajax) {
                return __utils__.sendAJAX(ajax);
            }, ajaxes[i]));

            fauxJax.write('\n});\n');
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

    if (resource.contentType.indexOf('html') === -1 && resource.url.indexOf(baseUrl) != -1) {

        resource.urlLong = resource.url.replace(baseUrl, '');
        resource.url = resource.url.replace(stripUrlParams, '$1');

        if (resource.contentType.indexOf('json') != -1 && notFile.exec(resource.url) && (ajaxes.indexOf(resource.url.replace(baseUrl, '')) == -1 || resource.url.indexOf('github'))) {

            resource.url = resource.url.replace(baseUrl, '');
            if (resource.url.indexOf('github') == -1)
                ajaxes.push(resource.url);
            else
                ajaxes.push(resource.urlLong);
            this.echo('\tPushed ' + resource.url + ' to ajax queue.');

        } else if (resources.indexOf(resource.url) == -1 && ajaxes.indexOf(resource.url.replace(baseUrl, '')) == -1) {
            var save = true;
            for (var i = 0; i < ignoreFiles.length; i++) {
                if (resource.url.indexOf(ignoreFiles[i]) != -1) {
                    save = false;
                    break;
                }
            }
            if (save)
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
        getAdditionalFiles.call(this);
        this.echo('Found ' + visited.length + ' links.');
        this.echo(' - ' + visited.join('\n - '));
        this.echo('Caught ' + resources.length + ' resources.');
        this.echo(' - ' + resources.join('\n - '));
        this.exit();
    }
}

//////////////Execution begins here/////////////////
getCli();
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
