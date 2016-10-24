import {EventEmitter} from "events";
import {BrokerAdapter, BrokerAdapterPublisherFactory, BrokerAdapterSubscriber} from "./adapter";
import {BrokerConfig, LocalConfig} from "../config";

class LocalBrokerAdapter implements BrokerAdapter {
  localBus = new EventEmitter();

  Publish(config: BrokerConfig): BrokerAdapterPublisherFactory {
    const adapter = this;
    return {
      channel: function(topic) {
        return {
          publish: function(message, cb) {
            const clonedMessage = JSON.parse(JSON.stringify(message));

            process.nextTick(function() {
              adapter.localBus.emit(topic, clonedMessage);
              (cb || _noop)();
            });
          },
          close: _noop
        };
      }
    };
  }

  Subscribe(config: BrokerConfig): BrokerAdapterSubscriber {
    const channel = new EventEmitter();

    function onMessage(message) {
      try {
        channel.emit("message", message);
      } catch (err) {
        channel.emit("error", err);
      }
    }

    this.localBus.on((<LocalConfig>config).channel, onMessage);

    return Object.create(channel, {
      close: () => this.localBus.removeListener("message", onMessage),
      onceConsuming: _noop,
      confirmProcessedMessage: _noop,
      rejectMessage: _noop
    });
  }

  close(): void {
  }
}

export function create(): BrokerAdapter {
  return new LocalBrokerAdapter();
}

function _noop() {}
