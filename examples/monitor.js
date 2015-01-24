var Table = require('cli-table');
var channelMonitor = require('..').channelMonitor;

channelMonitor
.on('updated', printTable).on('heartbeat', function() {
  printStatus(true);
})
.on('heartbeat-completed', function() {
  printStatus(false);
});

printTable({});
channelMonitor.startMonitoring();

function printTable(infoByTopic) {
  var table = new Table({
    head: ['Topic', 'Producers', 'Consumers', 'Last Consumed'],
    colWidths: [63, 11, 11, 19]
  });

  Object.keys(infoByTopic).sort().forEach(function(topic) {
    var channelInfo = infoByTopic[topic];
    table.push([
      topic,
      channelInfo.producers.length,
      channelInfo.consumers.length,
      (channelInfo.lastConsumedAt) ? timeDiffInWords(channelInfo.lastConsumedAt) : 'never'
    ]);
  });

  console.log('\033c' + table.toString());
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

  var diff = (now.valueOf() - date.valueOf()),
      ago = (diff > 0),
      agoWord = (ago) ? ' ago': '',
      inWord = (ago) ? '': 'in ';

  diff = Math.abs(diff);
  var diffSeconds = Math.round(diff / 1000),
      diffMinutes = Math.round(diffSeconds / 60),
      diffHours = Math.round(diffMinutes / 60),
      diffDays = Math.round(diffHours / 24),
      diffWeeks = Math.round(diffDays / 7);

  if (diffSeconds < 60) return 'just now';
  // if (diffSeconds < 60) return inWord + [diffSeconds, (diffSeconds > 1) ? 'seconds': 'second'].join(' ') + agoWord;
  if (diffMinutes < 60) return inWord + [diffMinutes, (diffMinutes > 1) ? 'minutes': 'minute'].join(' ') + agoWord;
  if (diffHours < 13 && ago) return inWord + [diffHours, (diffHours > 1) ? 'hours': 'hour'].join(' ') + agoWord;


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

  return date.toString('dddd'+ timeFormat);
}
