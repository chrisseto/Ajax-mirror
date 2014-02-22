//Global variables only change base url. NEVER leave a trailing /
var baseUrl = 'http://localhost:5000/62w3d';
var protocol = 'http://';
//Dont change anything past here
var linkToGo = ['/'];
var visited = [];
var resourceLinks = [];
var ajaxes = [];
var index = 0;
var spider = require('casper').create();
var fs= require('fs');
// /vars

function makeFauxJax(url) {
    var fauxJax = fs.open('.' + url + 'jax.js', 'w');

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
    ajaxes = [];
    return true;
}

function saveResources() {
  for (var i = 0; i < resourceLinks.length; i++) {
      var temp = resourceLinks[i].replace(baseUrl + '/','').split('/');
    temp.pop();
    fs.makeTree(temp.join('/'));
    this.download(resourceLinks[i], resourceLinks[i].replace(baseUrl + '/',''));
    }
}


function stripLinks() {
  var links = document.querySelectorAll('a');
  return Array.prototype.map.call(links, function(e) {
      return e.getAttribute('href');
  });
}

function cleanLinks(links) {
    return links.filter(function(element, position) {
        return links.indexOf(element) == position && element.charAt(0)=='/';
    });
}

function processLinks(links) {
    filtered = links.filter(function(element, position) {
        return links.indexOf(element) == position && element.charAt(0)=='/' && linkToGo.indexOf(element) == -1 && visited.indexOf(element) == -1;
    });

    linkToGo = linkToGo.concat(filtered);
}

function grab(url) {
  this.then(function() {
    var linklist = this.evaluate(stripLinks);
    if(linklist) {
      processLinks(linklist);
    }
  });
}

function localizeUrls(html) {
  html = html.replace(new RegExp('/static','g'),fs.workingDirectory + '/static');
  return html;
}

//Html grabbing will be done here pull from dumpHtml.js
function clone() {
  //removing first /
  var url = linkToGo[index].replace('/','');

  this.then(function() {

    var html = this.evaluate(function() {
      return document.all[0].outerHTML;//$('html').html();
    });

    html = localizeUrls(html);

    var temp = url.split('/');
    if(temp.length > 1) {
      temp.pop();
      fs.makeTree(temp.join('/'));
    } else {
      fs.makeTree(url);
    }
    if(url.slice(-1) === '/' || url == '')
      fs.write(url + 'index.html',html,'w');
    else
      fs.write(url + '.html',html,'w');
  });

}

function processResources() {
  resourceLinks = resourceLinks.filter(function(element,position) {
    return resourceLinks.indexOf(element) == position && element.indexOf(baseUrl) != -1 && element.slice(-1) != '/' && element.indexOf('.') != -1;
  });
  resourceLinks = resourceLinks.map(function(element) {
    if(element.indexOf('?') != -1)
          return element.substring(0,element.indexOf('?'));
        return element;
  });
}

spider.on('resource.received', function(resource) {
  if (resource.url.indexOf('.') == -1 && resource.url != linkToGo[index] && ajaxes.indexOf(resource.url) == -1)
    ajaxes.push(resource.url);
  else
    resourceLinks.push(resource.url);
});

//Here lives the big daddy driver function
function toSpiderOrNotToSpider() {
  if(linkToGo[index]) {
    if(visited.indexOf(linkToGo[index]) != -1) {
      index++;
      this.run(toSpiderOrNotToSpider);
    }
    this.echo('Crawling ' + baseUrl + linkToGo[index]);
    this.start(baseUrl + linkToGo[index]);
    grab.call(this,linkToGo[index]);
    clone.call(this);
    makeFauxJax.call(this, linkToGo[index]);
    visited.push(linkToGo[index]);
    index++;
    this.run(toSpiderOrNotToSpider);
  } else {
    processResources();
    saveResources.call(this);
    this.echo('Found ' + visited.length + ' links.');
    this.echo(' - ' + visited.join('\n - '));
    this.echo('Caught ' + resourceLinks.length + ' resources.');
    this.echo(' - ' + resourceLinks.join('\n - '));
    this.exit();
  }
}

spider.start().then(function() {
  this.echo('===============');
  this.echo('Spider started.');
  this.echo('===============\n');
});

//create base folder
if (!fs.exists(baseUrl.replace(protocol,'')))
  fs.makeDirectory(baseUrl.replace(protocol,''));
fs.changeWorkingDirectory(baseUrl.replace(protocol,''));

//Lift off!
spider.run(toSpiderOrNotToSpider);
