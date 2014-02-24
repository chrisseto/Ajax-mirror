var casper = require('casper').create();
var fs = require('fs');
var baseUrl = 'http://localhost:5000';
var protocol = 'http://';
var ajaxes = [];
var resources = [];
var getDirectory = /^(.+)\/([^\/]+)$/;

function buildFauxJax() {
    var fauxJax = fs.open('jax.js', 'w');

    fauxJax.write('(function() {\n');
    var temp;
    for (var i = 0; i < ajaxes.length; i++) {
        if (ajaxes[i].indexOf('?') != -1)
            temp = ajaxes[i].substring(0, ajaxes[i].indexOf('?')).replace(baseUrl,'');
        else
            temp = ajaxes[i].replace(baseUrl,'');
        fauxJax.write('$.mockjax({\nurl: \'' + temp + '\',\ndataType: \'json\',\nresponseText: ');

        fauxJax.write(this.evaluate(function(ajax) {
            return __utils__.sendAJAX(ajax);
        }, ajaxes[i]));

        fauxJax.write('\n});');
    }

    fauxJax.write('})();');
    fauxJax.close();
    return true;
};

function saveResources() {
    for (var i = 0; i < resources.length; i++) {
        //fs.makeTree(resources[i][2]); //Do I need to be here?
        this.download(resources[i][0], resources[i][1]);
    }
}

function processResources() {
    resources = resources.filter(function(element, position) {
        return resources.indexOf(element) == position;
    });
    casper.echo(resources);
}

casper.start(baseUrl);

casper.then(function() {
    var html = fs.open('page.html', 'w');
    var src = this.evaluate(function(url) {
        return __utils__.sendAJAX(url);
    }, baseUrl);
    src = src.replace(/\"(?:\/\/|["\/]+)*\//g, "\"./");
    html.write(src);
    html.write('<script src="./jquery.mockjax.js"></script>\n<script src="./jax.js"></script>');
    html.close();
    processResources.call(this);
    saveResources.call(this);
    buildFauxJax.call(this);
    this.exit();
});

casper.on('resource.requested', function(resource) {
    if (resource.url.indexOf('.') == -1 && resource.url != baseUrl && ajaxes.indexOf(resource.url) == -1) {
        ajaxes.push(resource.url);
    } else if (resources.indexOf(resource.url) == -1) {
        resources.push([resource.url, resource.url.replace(/^(?:\/\/|[^\/]+)*\//, "./"), getDirectory.exec(resource.url.replace(/^(?:\/\/|[^\/]+)*\//, "./"))[1] + '/']);
    }
});

if (!fs.exists(baseUrl.replace(protocol,'')))
    fs.makeDirectory(baseUrl.replace(protocol,''));
fs.changeWorkingDirectory(baseUrl.replace(protocol,''));

casper.run();
