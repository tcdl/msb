# Contributing to MSB

There are several ways of contributing to MSB:

* Help [improve the documentation](https://github.com/tcdl/msb/blob/master/README.md).
* Report an issue, please read instructions below.
* Help with triaging the [issues](http://github.com/tcdl/msb/issues). The clearer they are, the more likely they are to be fixed soon.
* Contribute to the code base.

## Reporting an issue

To save everyone time and make it much more likely for your issue to be understood, worked on and resolved quickly, it would help if you're mindful of [How to Report Bugs Effectively](http://www.chiark.greenend.org.uk/~sgtatham/bugs.html) when pressing the "Submit new issue" button.

As a minimum, please report the following:

* Which environment are you using? Broker, OS, Node versions?
* Which version of MSB?
* What other libraries are you using?
* What you expected to happen
* What actually happens
* Describe **with code** how to reproduce the faulty behaviour

## Contributing to the code base

Pick [an issue](http://github.com/tcdl/msb/issues) to fix, or pitch
a new feature with [an issue](http://github.com/tcdl/msb/issues/new).

### Making a pull request

Please try to [write great commit messages](http://chris.beams.io/posts/git-commit/).

There are numerous benefits to great commit messages

* They allow users to easily understand the consequences of updating to a newer version
* They help contributors understand what is going on with the codebase, allowing features and fixes to be developed faster
* They save maintainers time when compiling the changelog for a new release

If you're already a few commits in by the time you read this, you can still [change your commit messages](https://help.github.com/articles/changing-a-commit-message/).

Also, before making your pull request, consider if your commits make sense on their own (and potentially should be multiple pull requests) or if they can be squashed down to one commit (with a great message). There are no hard and fast rules about this, but being mindful of your readers greatly help you author good commits.

### Use EditorConfig

To save everyone some time, please use [EditorConfig](http://editorconfig.org), so your editor helps make
sure we all use the same encoding, indentation, line endings, etc. Otherwise, deduce the neccesary from [.editorconfig file](https://github.com/tcdl/msb/blob/master/.editorconfig).

### Installation

The MSB developer environment requires Node/NPM. Please make sure you have
Node installed, and install MSB's dependencies:

    $ npm install

This will also install a pre-commit hook, that runs style validation on staged files.

Note: You will also need an AMQP server to run related tests.

### Style

MSB uses [JSCS](sublime jscs) to keep consistent style. You probably want to install a plugin for your editor.

The code style test will be run before unit tests in the CI environment, your build will fail if it doesn't pass the style check.

```
$ npm run cs
```

To ensure consistent reporting of code style warnings, you should use the same version as CI environment (defined in `package.json`)

### Run the tests

This runs linting as well as unit tests in both PhantomJS and node

    $ npm test

##### Testing in development

MSB uses hapi.js [Lab](https://github.com/hapijs/lab) in BDD style, with [Code](https://github.com/hapijs/code), please read those docs if you're unfamiliar with it.

If you want to run tests as they will be run on CI:

    $ npm run test

If you want to run tests without code style check:

    $ npm run test-no-cs

If you just want to run with automatic restarting on a file change (no linting):

    $ npm run test-watch

The integration tests requires access to an AMQP instance, for example RabbitMQ, by default it expect it to be installed locally as it looks for localhost:5672.

###### RabbitMQ in Docker
[RabbitMQ](https://www.rabbitmq.com/) can be installed locally, or hosted in [Docker](https://www.docker.com/). 

To start an instance in docker:

```
docker run -d -p 5672:5672 --hostname msbRabbitMQ --name rabbitmq rabbitmq:3
```

To find out the ip address of the docker machine:

```
docker-machine ip default
```

Set the env variable `MSB_BROKER_HOST` to the ip address and run the test. 

On Linux and OSX:

```
MSB_BROKER_HOST=192.168.99.100 npm run test
``` 



###### Display AMQP connection info when running tests
Set the env variables `DEBUG=amqp*` and `AMQP=3`.

On Linux and OSX:

```
DEBUG=amqp* AMQP=3 node_modules/.bin/lab --verbose
``` 

... or using custom amqp instance:

```
MSB_BROKER_HOST=192.168.99.100 DEBUG=amqp* AMQP=3 node_modules/.bin/lab --verbose
``` 
