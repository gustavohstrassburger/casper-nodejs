//console.log("I am the casperjs program, you  spawned me :)");

var casper = require('casper').create();
var fs = require('fs');
var server;

try {

  //console.log(JSON.stringify(casper.cli.options, null, 2));

  // load the options from the command line
  var casper_url = JSON.parse(casper.cli.options['mlc-casper-url']);
  var casper_options = JSON.parse(casper.cli.options['mlc-casper-options']);
  var casper_lock = JSON.parse(casper.cli.options['mlc-casper-lock']);
  var port = JSON.parse(casper.cli.options['mlc-casper-port']);

  // console.log(casper_url);
  // console.log(casper_lock);

  for(var i in casper_options) {
    var option = casper_options[i];

    if(!Array.isArray(option) && (typeof option === 'object') ) {
      for(var j in option) {
        casper.options[i][j] = option[j];
      }
    }
    else 
      casper.options[i] = option;
  }

  // --
  var waitEventObj = {
    check: function() {
      //return false;
      if(server._event_received == true)
        ; //console.log("TRUE :)");
      return server._event_received;
    },
    then: function () {
      //this.echo('end of wait IDIOOOOOOOOOOOOOOOOOOOOOOOOOT');
    }, 
    onTimeout: function timeout(t) {
      //console.log('TIMEOUT ' + t + 'ms elapsed');
      casper.then(function() {
        waitEventObj.wait();
      });
    },
    timeout: 1000, // timeout of 10s
    wait: function() {
      casper.waitFor(waitEventObj.check, waitEventObj.then, waitEventObj.onTimeout, waitEventObj.timeout);
    }
  };

  // -------- to isolate

  var context = {};

  // initialize the events
  casper.on('mlc.then', function(callback, parameters) {
    //casper.echo(parameters);
    //casper.echo('!!!! received mlc.action !');
    server._event_received = true;

    casper.then(function() {
      
  //    casper.echo(typeof callback);  
      /*casper.echo("--------");
      casper.echo(callback);
      casper.echo("--------");*/

      //casper.echo("before");
      var fn = eval('(' + callback + ')');
      //casper.echo("after");

      casper.then(function() {
        // casper.echo("\033[31m[========] mlc.then execution in the context\033[0m");
        
        var __mlc_ret;

        try {
          __mlc_ret = fn.apply(this, parameters);

          // no return in the callback
          if(__mlc_ret === undefined)
            __mlc_ret = null;

          // execute fn in 'this' context
          server._send(server._response, JSON.stringify(__mlc_ret), 200);
          server._event_received = false;

          waitEventObj.wait(); //casper.waitFor();
        }
        catch(e) {
          console.error(e.track);
          this.exit();
        }
      });

      // casper.echo('!!!! registered action !');
    });
  });

  // ---------

  // 
  casper.start(casper_url, function() {
    // this.echo("casper.start executed");

    // créer le lock pour dire à casper-nodejs qu'il peut envoyer des ordres
    try {
      var fs = require('fs');
      // console.log("WRITING : " + casper_lock);
      fs.write(casper_lock, "1", 'w');
    }
    catch(e) {
      console.log(e);
      casper.exit(1);
    }
  });

  casper.then(function() {
    //this.echo("casper.then executed.");
    //this.echo("waiting for event");

    waitEventObj.wait(); //casper.waitFor();
  });

  casper.run(function() {
    // console.log("casper.run executed: end of the scraper");
    this.exit();
  });

  // listen to requests from nodejs
  server = require('./server.js');

  server.start(casper, port);

}
catch(err) {
  console.error(err.stack);
  casper.exit(1);
}

