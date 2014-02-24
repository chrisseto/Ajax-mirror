var casper = require('casper').create();
var fs = require('fs');
var baseUrl = 'http://localhost:5000';
var protocol = 'http://';
var ajaxes = [];
var resources = [];
var getDirectory = /^(.+)\/([^\/]+)$/;
var stripUrlParams = /(.+?)(\?.*)$/;
var caputuring = true;

function buildFauxJax() {
    if (ajaxes) {
        var fauxJax = fs.open('jax.js', 'w');

        fauxJax.write('(function() {\n');
        var temp;
        for (var i = 0; i < ajaxes.length; i++) {
            if (ajaxes[i].indexOf('?') != -1)
                temp = ajaxes[i].substring(0, ajaxes[i].indexOf('?')).replace(baseUrl, '');
            else
                temp = ajaxes[i].replace(baseUrl, '');
            fauxJax.write('$.mockjax({\nurl: \'' + temp + '\',\ndataType: \'json\',\nresponseText: ');

            fauxJax.write(this.evaluate(function(ajax) {
                return __utils__.sendAJAX(ajax);
            }, ajaxes[i]));

            fauxJax.write('\n});');
        }

        fauxJax.write('})();');
        fauxJax.close();
        return true;
    }
    return false;
};

function saveResources() {
    casper.echo('Saving resources.');
    for (var i = 0; i < resources.length; i++) {
        this.download(resources[i][0], resources[i][1]);
        casper.echo('Saved ' + resources[i][1] + ' (' + i + '/' + resources.length + ')');
    }
    casper.echo('Finished saving resources.');
}

casper.start(baseUrl);

casper.then(function() {
    var html = fs.open('page.html', 'w');
    var src = this.evaluate(function(url) {
        return __utils__.sendAJAX(url);
    }, baseUrl);
    src = src.replace(/\"(?:\/\/|["\/]+)*\//g, "\"./");
    html.write(src);
    if (buildFauxJax.call(this))
        html.write('<script src="./jquery.mockjax.js"></script>\n<script src="./jax.js"></script>');
    html.close();
    caputuring = false;
    saveResources.call(this);
    this.exit();
});

casper.on('resource.requested', function(resource) {
    if (caputuring) {
        if (resource.url.indexOf('.') == -1 && resource.url != baseUrl + '/' && ajaxes.indexOf(resource.url) == -1) {
            casper.echo('Pushed ' +  resource.url + ' to ajax queue.');
            ajaxes.push(resource.url);
        } else if (resources.indexOf(resource) == -1 && resource.url != baseUrl + '/') {
            resource.url = resource.url.replace(stripUrlParams, '$1');
            resources.push([resource.url, resource.url.replace(/^(?:\/\/|[^\/]+)*\//, "./"), getDirectory.exec(resource.url.replace(/^(?:\/\/|[^\/]+)*\//, "./"))[1] + '/']);
        }
    }
});

if (!fs.exists(baseUrl.replace(protocol, '')))
    fs.makeDirectory(baseUrl.replace(protocol, ''));
fs.changeWorkingDirectory(baseUrl.replace(protocol, ''));

casper.run();
