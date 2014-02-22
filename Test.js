var casper = require('casper').create();
var fs = require('fs');

var ajaxes = [];
var resouces = [];

function buildFauxJax() {
    var fauxJax = fs.open('jax.js', 'w');

    fauxJax.write('(function() {\n');

    for (var i = 0; i < ajaxes.length; i++) {

        fauxJax.write('$.mockjax({\nurl: \'' + ajaxes[i] + '\',\ndataType: \'json\',\nresponseText: ');

        fauxJax.write(this.evaluate(function(ajax) {
            return __utils__.sendAJAX(ajax);
        }, ajaxes[i]));

        fauxJax.write('\n});');
    }

    fauxJax.write('})();');
    fauxJax.close();
    return true;
};

casper.start('http://localhost:5000/62w3d/', function() {
    var js = this.evaluate(function(ajaxes) {
        return __utils__.sendAJAX('http://localhost:5000/62w3d/');
    }, ajaxes);
    buildFauxJax.call(this);
    this.exit();
});

casper.on('resource.requested', function(resource) {
    if (resource.url.indexOf('.') == -1 && resource.url != 'http://localhost:5000/62w3d/' && ajaxes.indexOf(resource.url) == -1) {
        ajaxes.push(resource.url);
    } else {
      resouces.push(resource.url);
    }
});

casper.run();
