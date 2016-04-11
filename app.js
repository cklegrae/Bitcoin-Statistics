var torIPList = new Array;
var ws = new WebSocket('wss://ws.blockchain.info/inv');

ws.onopen = function (e) {
  ws.send('{"op":"unconfirmed_sub"}');
}

ws.onmessage = function (e) {
  var transaction = JSON.parse(e.data);
  var relayed_by_ip = transaction.x.relayed_by;
  if (isTorIP(relayed_by_ip)) {
    console.log("WOAH");
  }
  //console.log(getLocation(relayed_by_ip));
}


// Take in relayed_by IP from transaction, and see if it is a Tor node
function isTorIP (relayed_by_ip) {
  return ($.inArray(relayed_by_ip, torIPList) !== -1)
}

function getLocation (relayed_by_ip) {
  var query = "http://127.0.0.1:8080/api/" + relayed_by_ip
  $.getJSON(query, function(data) {
    debugger
    var country =data.country.name;
  });

  // $.ajax({
  //   url: query,
  //   jsonp: "foo",
  //   crossDomain: true,
  //   dataType: 'jsonp',
  //   success: function(json) {
  //      debugger
  //   },
  //   error: function(e) {
  //      console.log("fg");
  //   }
  // });
}

function foo(data){
  debugger;
}

$(document).ready(function () {
  // Populate torIPList
  $.get('exit_node_list.txt', function (data) {
    $.each(data.split('\n'), function (i, val) {
      torIPList.push(val);
    });
  });
})

