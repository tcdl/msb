# microservicebus

Components for use in microservices attached to the bus

## Overview

...

## API

## Contributor

A contributor can send acks and contributions via the bus.

## Collector

A collector is a component that listens for multiple messages on a topic, with timeouts and number of contributions determining its lifetime.

## Originator

An originator is a collector component that can also publish new messages on the bus.

## Middleware

Middleware that translates from http to the bus can be created per config.

## Channel Manager

The channel manager enables re-use of channels listening/publishing per topic.
