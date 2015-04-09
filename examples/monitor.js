'use strict';
var Table = require('cli-table');
var channelMonitor = require('..').channelMonitor;
var lastDoc;

channelMonitor
.on('updated', printTable)
.on('heartbeat', function() {
  printStatus(true);
});

printTable({});
channelMonitor.start();
process.stdout.on('resize', printTable);

function printTable(doc) {
  doc = lastDoc = doc || lastDoc;
  var infoByTopic = doc.infoByTopic || {};
  var table = new Table({
    head: ['Topic', 'Producers', 'Last Produced', 'Consumers', 'Last Consumed'],
    colWidths: [process.stdout.getWindowSize()[0] - 58, 11, 15, 11, 15]
  });

  var data = [];
  Object.keys(infoByTopic).sort().forEach(function(topic) {
    var channelInfo = infoByTopic[topic];
    if (!channelInfo || (!channelInfo.lastProducedAt && !channelInfo.lastConsumedAt)) return;
    data.push([
      topic,
      channelInfo.producers.length,
      (channelInfo.lastProducedAt) ? timeDiffInWords(channelInfo.lastProducedAt) : 'never',
      channelInfo.consumers.length,
      (channelInfo.lastConsumedAt) ? timeDiffInWords(channelInfo.lastConsumedAt) : 'never'
    ]);
  });

  table.push.apply(table, data);
  console.log('\x1Bc' + table.toString());
  // printStatus(true);
}

function printStatus(isUpdating) {
  process.stdout.clearLine();
  process.stdout.cursorTo(0);
  console.log((isUpdating) ? '...' : '');
}

/**
 * Outputs a string with time ago in most appropriate units
 *
 * @param {Date} date
 * @return {String}
 * @api public
 */
function timeDiffInWords(date, excludeTime) {
  date = new Date(date);
  var now = new Date();

  var diff = (now.valueOf() - date.valueOf());
  var ago = (diff > 0);
  var agoWord = (ago) ? ' ago' : '';
  var inWord = (ago) ? '' : 'in ';

  diff = Math.abs(diff);
  var diffSeconds = Math.round(diff / 1000);
  var diffMinutes = Math.round(diffSeconds / 60);
  var diffHours = Math.round(diffMinutes / 60);
  var diffDays = Math.round(diffHours / 24);
  var diffWeeks = Math.round(diffDays / 7);

  if (diffSeconds < 60) return 'just now';
  // if (diffSeconds < 60) return inWord + [diffSeconds, (diffSeconds > 1) ? 'seconds': 'second'].join(' ') + agoWord;
  if (diffMinutes < 60) return inWord + [diffMinutes, (diffMinutes > 1) ? 'mins' : 'min'].join(' ') + agoWord;
  if (diffHours < 13 && ago) return inWord + [diffHours, (diffHours > 1) ? 'hrs' : 'h'].join(' ') + agoWord;

  var timeFormat = (excludeTime) ? '' : ' \'at\' h:mm tt';

  if (diffWeeks > 1) {
    return date.toString('d MMMM yyyy' + timeFormat);
  }

  if (diffDays === 0) {
    return date.toString('\'Today\'' + timeFormat);
  }

  if (diffDays === 1) {
    var day = (ago) ? 'Yesterday' : 'Tomorrow';
    return date.toString('\'' + day + '\'' + timeFormat);
  }

  if (diffDays > 2) {
    return date.toString('dddd d MMMM' + timeFormat);
  }

  return date.toString('dddd' + timeFormat);
}
