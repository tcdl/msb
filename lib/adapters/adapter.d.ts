import {EventEmitter} from "events";
import {Message} from "../messageFactory";
import {BrokerConfig, ConsumerOptions} from "../config";

interface BrokerAdapter {
  Publish(config: BrokerConfig): BrokerPublisherAdapterFactory;
  Subscribe(config: BrokerConfig): BrokerSubscriberAdapterFactory;
  close(): void;
}

interface BrokerPublisherAdapterFactory {
  channel(topic: string): BrokerPublisherAdapter;
}

interface BrokerSubscriberAdapterFactory {
  channel(namespace: string, options: ConsumerOptions): BrokerSubscriberAdapter;
}

interface BrokerPublisherAdapter {
  publish(message: Message, cb: (err?: Error) => void): void;
  close(): void;
}

interface BrokerSubscriberAdapter extends EventEmitter {
  onceConsuming(cb: Function): void;
  confirmProcessedMessage(message: Message, _safe: boolean): void;
  rejectMessage(message: Message): void;
  close(): void;
}
