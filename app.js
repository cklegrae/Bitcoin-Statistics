var torIPList = new Array;
var ws = new WebSocket('wss://ws.blockchain.info/inv');
var NOT_FOUND = "No record found for this IP";

// Take in relayed_by IP from transaction, and see if it is a Tor node
function isTorIP (relayed_by_ip) {
  return ($.inArray(relayed_by_ip, torIPList) !== -1);
}

// Returns the IP's country of origin
function getLocation (relayed_by_ip, callback) {
  var query = "http://geoip.nekudo.com/api/" + relayed_by_ip;
  $.getJSON(query)
    .done(function (data) {
      if (data.type !== "error") {
        callback(data.country.name);
      }
      else {
        callback(NOT_FOUND);
      }
    })
    .fail(function (err) {
      console.log("Error getting JSON feed: " + err);
  });
}

// Subscribe to blockchain websocket
ws.onopen = function (e) {
  ws.send('{"op":"unconfirmed_sub"}');
}

ws.onmessage = function (e) {
  var transaction = JSON.parse(e.data);
  var relayed_by_ip = transaction.x.relayed_by;

  // Testing stuff
  getLocation(relayed_by_ip, function (location) {
    $("#locations").append("<br>" + location);
  })

  if (isTorIP(relayed_by_ip)) {
    $("#locations").append(" TOR");
  }
}

$(document).ready(function () {
  // Populate torIPList
  $.get('exit_node_list.txt', function (data) {
    $.each(data.split('\n'), function (i, val) {
      torIPList.push(val);
    });
  });
})

