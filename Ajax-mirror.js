//Global variables only change base url. Don't leave a trailing /
var baseUrl = 'http://localhost:5000';
var protocol = 'http://';
//Dont change anything past here
var linkToGo = ['/'];
var visited = [];
var resourceLinks = [];
var ajaxes = [];
var index = 0;
var casper = require('casper').create();
var fs = require('fs');
// /vars

casper.on('resource.requested', function(resource) {
  //TODO logic
});

function localizeUrls(html) {
  //TODO
}

function virginHtml(url){
    return this.evaluate(function(uri) {
        return __utils__.sendAJAX(uri);
    }, url);
}

function buildFauxJax(jaxes) {
    var fauxJax = fs.open('jax.js', 'w');

    fauxJax.write('(function() {\n');

    for (var i = 0; i < jaxes.length; i++) {

        fauxJax.write('$.mockjax({\nurl: \'' + jaxes[i] + '\',\ndataType: \'json\',\nresponseText: ');

        fauxJax.write(this.evaluate(function(ajax) {
            return __utils__.sendAJAX(ajax);
        }, jaxes[i]));

        fauxJax.write('\n});');
    }

    fauxJax.write('})();');
    fauxJax.close();
    return true;
};

//create base folder
if (!fs.exists(baseUrl.replace(protocol,'')))
  fs.makeDirectory(baseUrl.replace(protocol,''));
fs.changeWorkingDirectory(baseUrl.replace(protocol,''));
