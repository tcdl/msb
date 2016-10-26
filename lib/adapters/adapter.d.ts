import {EventEmitter} from "events";
import {Message} from "../messageFactory";
import {BrokerConfig, ConsumerOptions, ProducerOptions} from "../config";

interface BrokerAdapter {
  Publish(config: BrokerConfig): BrokerPublisherAdapterFactory;
  Subscribe(config: BrokerConfig): BrokerSubscriberAdapterFactory;
  close(): void;
}

interface BrokerPublisherAdapterFactory {
  channel(namespace: string, options: ProducerOptions): BrokerPublisherAdapter;
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
