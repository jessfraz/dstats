'use strict'

// dependencies
var path     = require('path'),
    request  = require('request'),
    stream   = require('stream'),
    util     = require('util'),
    Writable = stream.Writable;

// function to get all containers
function GetAllContainers(host, func) {
    request({
        json:   true,
        method: 'GET',
        uri:    host + '/containers/json?all=1'
    }, function (err, resp, body) {
        var containers = [];

        if (err) {
            return func(err, containers);
        }
    
        if (resp.statusCode != 200) {
            i// cli.debug("Server response:", resp);
            return func(new Error("Status from server was: " + resp.statusCode), containers);
        }
        
        if (body.length <= 0) {
            return func(new Error("You have no containers currently.", containers))
        }
        
        var containers
        body.forEach(function(el) {
            containers.push(el.Id);
        });

        return func(err, containers);
    });
};

function StatsStream(el, line, screen, options) {
    // allow use without new operator
    if (!(this instanceof StatsStream)) {
        return new StatsStream(el, options);
    }

    Writable.call(this, options);
    this.el     = el;
    this.line   = line;
    this.screen = screen;
    this.x      = [];
    this.y      = [];
    this.total_usage = []
    this.system_cpu_usage = []
    this.num_cpus = []
};
util.inherits(StatsStream, Writable);
StatsStream.prototype._write = function (chunk, enc, cb) {
        chunk = chunk.toString();
        try {
            chunk = JSON.parse(chunk);
        } catch (e) {
            console.log(chunk, "is not JSON");
            return cb();
        }
        if (this.x.length > 10) { this.x.shift(); }
        if (this.y.length > 10) { this.y.shift(); }
        if (this.total_usage.length > 10) { this.total_usage.shift(); }
        if (this.system_cpu_usage.length > 10) { this.system_cpu_usage.shift(); }
        if (this.num_cpus.length > 10) { this.nump_cpus.shift(); }

        // append the chunk values
        var now = new Date();
        this.x.push(now.getUTCHours() + ':' + now.getUTCMinutes() + ':' + now.getUTCSeconds() + ':' + now.getUTCMilliseconds());
        this.total_usage.push(chunk.cpu_stats.cpu_usage.total_usage);
        this.system_cpu_usage.push(chunk.cpu_stats.system_cpu_usage);
        this.num_cpus.push(chunk.cpu_stats.cpu_usage.percpu_usage.length);


        if (this.total_usage.length > 1) {
          this.y.push( ((this.total_usage.slice(-1)[0] - this.total_usage.slice(-2)[0]).toFixed(8) / (this.system_cpu_usage.slice(-1)[0] - this.system_cpu_usage.slice(-2)[0]).toFixed(8)) * this.num_cpus.slice(-1)[0] )
        }

        // set the data
        this.line.setData(this.x, this.y);
        // render
        this.screen.render();

        return cb();
};

function GetStats(host, el, line, screen) {
    var sstream = new StatsStream(el, line, screen);
    
    sstream.on('finish', function () {
        console.log('finished writing for', el);
    });

    request({
        json:   true,
        method: 'GET',
        uri:    host + '/containers/' + el + '/stats'
    }).pipe(sstream);  
};

exports.GetAllContainers = GetAllContainers;
exports.GetStats         = GetStats;
