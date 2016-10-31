import {
  BrokerAdapter,
  BrokerPublisherAdapterFactory,
  BrokerSubscriberAdapter,
  BrokerPublisherAdapter
} from "./adapter";
import {EventEmitter} from "events";
import {BrokerConfig, LocalConfig} from "../config";
import {Message} from "../messageFactory";

class LocalBrokerAdapter implements BrokerAdapter {
  localBus = new EventEmitter();

  Publish(config: BrokerConfig): BrokerPublisherAdapterFactory {
    const adapter = this;
    return {
      channel: (topic): BrokerPublisherAdapter => {
        return {
          publish: (message: Message, cb: (err?: Error) => void): void => {
            const clonedMessage = JSON.parse(JSON.stringify(message));

            process.nextTick((): void => {
              adapter.localBus.emit(topic, clonedMessage);
              (cb || _noop)();
            });
          },
          close: _noop
        };
      }
    };
  }

  Subscribe(config: BrokerConfig): BrokerSubscriberAdapter {
    const channel = new EventEmitter();

    function onMessage(message): void {
      try {
        channel.emit("message", message);
      } catch (err) {
        channel.emit("error", err);
      }
    }

    this.localBus.on((<LocalConfig>config).channel, onMessage);

    return Object.create(channel, {
      close: (): void => {
        this.localBus.removeListener("message", onMessage);
      },
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

//todo: remove
function _noop(): void {
}
