var casper = require('casper').create();
var fs = require('fs');
var baseUrl = 'http://localhost:5000';
var protocol = 'http://';
var ajaxes = [];
var resources = [];

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
        var temp = resources[i].replace(baseUrl + '/', '').split('/');
        temp.pop();
        fs.makeTree(temp.join('/'));
        this.download(resources[i], resources[i].replace(baseUrl + '/', ''));
    }
}

function processResources() {
    resources = resources.filter(function(element, position) {
        return resources.indexOf(element) == position && element.indexOf(baseUrl) != -1 && element.slice(-1) != '/' && element.indexOf('.') != -1;
    });
    resources = resources.map(function(element) {
        if (element.indexOf('?') != -1)
            return element.substring(0, element.indexOf('?'));
        return element;
        casper.echo(element);
    });
}

casper.start('http://localhost:5000/62w3d/');

casper.then(function() {
    var html = fs.open('page.html', 'w');
    var src = this.evaluate(function() {
        return __utils__.sendAJAX('http://localhost:5000/62w3d/');
    });
    src = src.replace(new RegExp('/static','g'),'./static');
    src = src.replace(new RegExp('/addons./static','g'),'./addons/static');
    html.write(src);
    html.write('<script src="./jquery.mockjax.js"></script>\n<script src="./jax.js"></script>');
    html.close();
    processResources.call(this);
    saveResources.call(this);
    buildFauxJax.call(this);
    this.exit();
});

casper.on('resource.requested', function(resource) {
    if (resource.url.indexOf('.') == -1 && resource.url != 'http://localhost:5000/62w3d/' && ajaxes.indexOf(resource.url) == -1) {
        ajaxes.push(resource.url);
    } else if (resources.indexOf(resource.url) == -1) {
        resources.push(resource.url);
    }
});

if (!fs.exists(baseUrl.replace(protocol,'')))
    fs.makeDirectory(baseUrl.replace(protocol,''));
fs.changeWorkingDirectory(baseUrl.replace(protocol,''));

casper.run();
