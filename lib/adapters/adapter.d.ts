import {EventEmitter} from "events";
import {Message} from "../messageFactory";
import {BrokerConfig} from "../config";

interface BrokerAdapter {
  Publish(config: BrokerConfig): BrokerAdapterPublisherFactory;
  Subscribe(config: BrokerConfig): BrokerAdapterSubscriber;
  close(): void;
}

interface BrokerAdapterPublisherFactory {
  channel(topic: string): BrokerAdapterPublisher;
}

interface BrokerAdapterPublisher {
  publish(message: Message, cb: (err?: Error) => void): void;
  close(): void;
}

interface BrokerAdapterSubscriber extends EventEmitter {
  onceConsuming(cb: Function): void;
  confirmProcessedMessage(message: Message, _safe: boolean): void;
  rejectMessage(message: Message): void;
  close(): void;
}
