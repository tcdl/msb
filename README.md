# microservicebus

Components for use in microservices attached to the bus

## Overview

...

## API

## Broadcaster (Not implemented)

A broadcaster creates and publishes formatted messages.

## Listener (Not implemented)

A listener emits each correctly formatted message it receives.

## Responder

A responder enables sending of formatted acks and responses in response to each request message received on a topic/namespace.

## Requester

An requester is a collector component that can also publish new messages on the bus.

## Collector

A collector is a component that listens for multiple response messages, with timeouts and number of responses determining its lifetime.

## Channel Manager

The channel manager enables re-use of channels listening/publishing per topic.
