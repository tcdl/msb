# microservicebus

Components for use in microservices attached to the bus

## Overview

...

## API

## Responder

A responder can send acks and responses via the bus. Responders can be created from messages received by
listening on a topic/namespace.

## Collector

A collector is a component that listens for multiple messages on a topic, with timeouts and number of responses determining its lifetime.

## Requester

An requester is a collector component that can also publish new messages on the bus.

## Channel Manager

The channel manager enables re-use of channels listening/publishing per topic.
