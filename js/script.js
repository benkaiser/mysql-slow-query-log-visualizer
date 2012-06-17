/*
MySQL Slow Query Log Visualizer
By Geoff Gaudreault (http://www.neurofuzzy.net)

Many thanks to:

List.js author Jonny Strömberg (www.jonnystromberg.se, www.listjs.com)
https://github.com/javve/list

jQuery Visualize author Scott Jehl, Filament Group scott@filamentgroup.com
https://github.com/filamentgroup/jQuery-Visualize

License (MIT)

Copyright (c) 2011 Geoff Gaudreault http://www.neurofuzzy.net

Permission is hereby granted, free of charge, to any person
obtaining a copy of this software and associated documentation
files (the "Software"), to deal in the Software without restriction,
including without limitation the rights to use, copy, modify, merge,
publish, distribute, sublicense, and/or sell copies of the Software,
and to permit persons to whom the Software is furnished to do so,
subject to the following conditions:

The above copyright notice and this permission notice shall be
included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES
OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT
HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY,
WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR
OTHER DEALINGS IN THE SOFTWARE.

*/

function processLog (logtext)
{
    var log_entry;
    var log_lines;
    var date_string;
    var entry_stats;
    
    logdata = logtext.split("# User@Host: ");
    logdata.shift();

    for (var i = 0; i < logdata.length; i++) {
        
        // load string
        
        log_entry = logdata[i];
        logdata[i] = {};
        
        log_lines = log_entry.split("\n");
       
        // get host
        
        logdata[i].db_name = log_lines[0].split("[")[1].split("]")[0];
       
        // get stats
        
        entry_stats = log_lines[1].split(" ");
        logdata[i].query_time = entry_stats[2]; // query time
        logdata[i].lock_time = entry_stats[5]; // lock time
        logdata[i].rows_sent = entry_stats[7]; // rows sent
        logdata[i].rows_examined = entry_stats[10]; // row examined
        
        if (log_lines[2].substr(0,3) == "use") {
            log_lines.shift(); 
        }
        
        date_string = log_lines[2].split("SET timestamp=")[1].split(";")[0];
        
        // parse date
        
        d = new Date(date_string * 1000);
        
        var year = d.getFullYear();
        
        var month = (d.getUTCMonth() + 1) + "";
        if (month.length == 1) month = "0" + month;
        
        var day = d.getDate().toString();
        if (day.length == 1) day = "0" + day;
        
        var dayOfWeek = d.getDay();
        
        var hours = d.getHours().toString();
        if (hours.length == 1) hours = "0" + hours;
        
        var mins = d.getMinutes().toString();
        if (mins.length == 1) mins = "0" + mins;
        
        date_string = year + "/" + month + "/" + day + " " + hours + ":" + mins;
        
        logdata[i].dateObj = d; // date
        logdata[i].date = date_string;
        logdata[i].hour = hours;
        
        // isolate query
        
        log_lines.shift();
        log_lines.shift();
        log_lines.shift();
        
        logdata[i].query_string = log_lines.join("\n").split("# Time: ")[0]; // query
        
        // time stats
        
        if (timedata[dayOfWeek][hours] == null) {
            timedata[dayOfWeek][hours] = 0;
        }
        
        timedata[dayOfWeek][hours]++;
        
    }
    
    return logdata.length;
}

function createList ()
{
    var options = {
        item: 'log_list_item',
        maxVisibleItemsCount: 3000
    }
    
    list = new List('log_list', options, logdata);
    
    document.getElementById('drop_zone').style.display = 'none';
    document.getElementById('log_list').style.display = 'table';

    var options2 = {
        item: 'time_list_item'
    }
    list2 = new List('time_list', options2, timedata);
    
    $("#log_list_search").keyup(updateTimeChart);
}

function createChart() {
    $('table#time_list tfoot').remove();
    $('table#time_list').visualize({
        type: 'line', 
        width: (window.innerWidth - 200) + 'px', 
        height: '400px'
    }).appendTo('#chart').trigger('visualizeRefresh');
    document.getElementById('time_list').style.display = 'none';
}

function updateTimeChart () {
    
    var count = 0;
    var is = list.items;
    var dayOfWeek;
    
    var hours;
    for (var d = 0; d < 7; d++) {
        for (var hour in timedata[d]) {
            timedata[d][hour] = 0;
        }
        timedata[d].dayName = dayNames[d];
    }
    
    for (var i = 0, il = is.length; i < il && i < 300000; i++) {
        if (
            (list.filtered && list.searched && is[i].found && is[i].filtered) ||
            (list.filtered && !list.searched && is[i].filtered) ||
            (!list.filtered && list.searched && is[i].found) ||
            (!list.filtered && !list.searched)
            ) {
            var obj = is[i].values();
            hours = obj.hour;
            dayOfWeek = obj.dateObj.getDay();
            timedata[dayOfWeek][hours]++;
            count++;
        }
    }
    $("#search_count").text(count + " results ");
    for (d = 0; d < 7; d++) {
        list2.items[d].values(timedata[d]);
    }
    $('.visualize').trigger('visualizeRefresh');
}

function handleFileSelect(evt) {
    evt.stopPropagation();
    evt.preventDefault();

    var files = evt.dataTransfer.files; // FileList object.

    // files is a FileList of File objects. List some properties.
    var output = [];
    var f = files[0];

    output.push('<strong>', f.name, '</strong> (', f.type || 'n/a', ') - ',
        f.size, ' bytes');

    document.getElementById('drop_result').innerHTML = '<h2>Loading ' + output.join('') + '</h2>';


    var reader = new FileReader();
    
    // Closure to capture the file information.
    reader.onloadend = function(e) {
        if (e.target.readyState == FileReader.DONE) {
            var len = processLog(e.target.result);
            var span = document.createElement('span');
            span.innerHTML = "Imported " + len + " entries.";
            document.getElementById('load_result').insertBefore(span, null);
            createList();
            try {
                createChart();
            } catch (error) {
                console.log(error);
            }
        }
    };

    // Read in the image file as a data URL.
    reader.readAsText(f);
}

function handleDragOver(evt) {
    evt.stopPropagation();
    evt.preventDefault();
    evt.dataTransfer.dropEffect = 'copy'; // Explicitly show this is a copy.
}

function start() {
    // Setup the dnd listeners.
    var dropZone = document.getElementById('drop_zone');
    dropZone.addEventListener('dragover', handleDragOver, false);
    dropZone.addEventListener('drop', handleFileSelect, false);
}

var logdata = [];
var timedata = [];
var dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
for (var i = 0; i < 7; i++) {
    timedata[i] = {};
    timedata[i].dayName = dayNames[i];
}
var list;
var list2;