var casper = require('casper').create();
var fs = require('fs');
var baseUrl = 'http://localhost:5000/62w3d/'; //The starting url should really only be http://localhost:500/
var protocol, domain;

//Change to dictionarys
var ajaxes = [];
var resources = [];
var getDirectory = /^(.+)\/([^\/]+)$/;
var stripUrlParams = /(.+?)(\?.*)$/;
var caputuring = true;

function parseUrl(url) {
    var matches = /^(.+:\/\/)(.+?)\/(.*)$/.exec(url);
    protocol = matches[1];
    domain = matches[2];
}

function getSaveName(url) {
    var save = url;
    url = url.replace(protocol + domain, '');
    if(url.charAt(url.length-1) === '/')
        url += 'index.html';
    casper.echo('Saving ' + save + ' as .' + url);
    return '.' + url;
}

function buildFauxJax() {
    casper.echo('Mocking AJAX...')
    if (ajaxes.length > 0) {
        var fauxJax = fs.open('.' + baseUrl.replace(protocol + domain, '') + 'fauxJax.js', 'w');

        fauxJax.write('(function() {\n');

        for (var i = 0; i < ajaxes.length; i++) {
            casper.echo('Mocking request to ' + ajaxes[i] + ' (' + (i+1) + '/' + ajaxes.length + ')');
            fauxJax.write('$.mockjax({\nurl: \'' + ajaxes[i] + '\',\ndataType: \'json\',\nresponseText: ');

            fauxJax.write(this.evaluate(function(ajax) {
                return __utils__.sendAJAX(ajax);
            }, ajaxes[i]));

            fauxJax.write('\n});');
        }

        fauxJax.write('})();');
        fauxJax.close();
        casper.echo('Finished mocking.')
        return true;
    }
    casper.echo('Finished mocking.')
    return false;
};

function saveResources() {
    casper.echo('Saving resources...');
    for (var i = 0; i < resources.length; i++) {
        this.download(resources[i][0], resources[i][1]);
        casper.echo('Saved ' + resources[i][1] + ' (' + (i+1) + '/' + resources.length + ')');
    }
    casper.echo('Finished saving resources.');
}

function finishClonePage() {
    var html = fs.open(getSaveName(baseUrl), 'w');
    caputuring = false;
    var src = this.evaluate(function(url) {
        return __utils__.sendAJAX(url);
    }, baseUrl);
    src = src.replace(/\"(?:\/\/|["\/]+)*\//g, '"' + fs.workingDirectory + '/');
    html.write(src);
    if (buildFauxJax.call(this))
        html.write('<script src="' + fs.workingDirectory + '/static/js/jquery.mockjax.js"></script>\n<script src="./fauxJax.js"></script>');
    html.close();
    saveResources.call(this);
    this.echo('Finished cloning ' + baseUrl);
}


casper.on('resource.requested', function(resource) {
    if (caputuring) {
        //Or up here
        resource.url = resource.url.replace(stripUrlParams, '$1');

        if (resource.url.indexOf('.') == -1 && resource.url != baseUrl + '/' && resource.url != baseUrl && ajaxes.indexOf(resource.url) == -1) {
            resource.url = resource.url.replace(protocol + domain, '');
            casper.echo('Pushed ' +  resource.url + ' to ajax queue.');
            //TODO regex parse urls here.
            ajaxes.push(resource.url);
        } else if (resources.indexOf(resource) == -1 && resource.url != baseUrl + '/') {
            //TODO fix resource duplication bug
            resources.push([resource.url, resource.url.replace(/^(?:\/\/|[^\/]+)*\//, "./"), getDirectory.exec(resource.url.replace(/^(?:\/\/|[^\/]+)*\//, "./"))[1] + '/']);
        }
    }
});

function cloneUrl(url)
{
    casper.thenOpen(url);
    casper.then(finishClonePage);
}
//////////////Execution begins here/////////////////
parseUrl(baseUrl);
//Creating the base directory
if (!fs.exists(domain))
    fs.makeDirectory(domain);
fs.changeWorkingDirectory(domain);

casper.start();
//cloneUrl.call(this, baseUrl);
cloneUrl.call(this, 'http://localhost:5000/');
casper.run();
//casper.exit();
