@contentstack/cli-cm-import
=================================

It is Contentstack’s CLI plugin to import content in the stack. To learn how to export and import content in Contentstack, refer to the [Migration guide](https://www.contentstack.com/docs/developers/cli/migration/). 

[![License](https://img.shields.io/npm/l/@contentstack/cli)](https://github.com/contentstack/cli/blob/main/LICENSE)

<!-- toc -->
* [Usage](#usage)
* [Commands](#commands)
<!-- tocstop -->
# Usage
<!-- usage -->
```sh-session
$ npm install -g @contentstack/cli-cm-import
$ csdx COMMAND
running command...
$ csdx (-v|--version|version)
@contentstack/cli-cm-import/0.1.1-beta.1 darwin-x64 node-v10.19.0
$ csdx --help [COMMAND]
USAGE
  $ csdx COMMAND
...
```
<!-- usagestop -->
# Commands
<!-- commands -->
* [`csdx cm:import`](#csdx-cmimport)

## `csdx cm:import`

Import script for importing the content into new stack

```
USAGE
  $ csdx cm:import

OPTIONS
  -A, --auth-token                                     to use auth token
  -a, --management-token-alias=management-token-alias  alias of the management token
  -c, --config=config                                  [optional] path of config file
  -d, --data=data                                      path and location where data is stored
  -l, --master-lang=master-lang                        code of the target stack's master language
  -m, --module=module                                  [optional] specific module name
  -s, --stack-uid=stack-uid                            API key of the target stack

DESCRIPTION
  ...
  Once you export content from the source stack, import it to your destination stack by using the cm:import command.

EXAMPLES
  csdx cm:import -A
  csdx cm:import -A -l "master-language" -s "stack_ApiKey" -d "path/of/export/destination/dir"
  csdx cm:import -A -c "path/of/config/dir"
  csdx cm:import -a "management_token_alias"
  csdx cm:import -a "management_token_alias" -l "master-language" -d "path/of/export/destination/dir"
  csdx cm:import -a "management_token_alias" -c "path/of/config/file"
  csdx cm:import -A -m "single module name"
```

_See code: [src/commands/cm/import.js](https://github.com/contentstack/cli/blob/v0.1.1-beta.1/packages/contentstack-import/src/commands/cm/import.js)_
<!-- commandsstop -->
