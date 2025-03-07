# LID Logger

LID is an NPM package designed to monitor and collect data from various server events, such as user sign-ins, transaction statuses, and more. It can store this data in `.txt` and `.csv` files and even send it to another system on the network using its IP address.

## Installation

To install LID, run the following command in your project directory:

```shell
npm install lid
```

## Usage

### Importing LID

First, import LID into your JavaScript file:

```javascript
import lid from 'lid';
```

### Creating a LID Instance

Create a new instance of LID by passing in the levels and configuration options:

```javascript
const logger = new lid(
    [
        {
            lvlName: 'level test',
            tags: [
                {
                    tagName: 'tag name test',
                    tagMessage: 'tag message text'
                },
            ],
        },
    ],
    {
        files: [
            'Drive:/add/a/folder/path/log_test_name.csv',
            'Drive:/add/a/folder/path/log_test_name.txt',
        ],
        tcpConnections: [
            {
                address: '127.0.0.1',
                port: 1342,
                secretKey: `any password`,
            }
        ],
        writeOnconsole: false, // print log on cmd
    }
);
```

### Initializing Connections (Optional)

If you are using a TCP server, initialize the connections:

```javascript
await logger.initializeConnections();
```

### Logging Messages

Use the `log` method to log messages:

```javascript
logger.log(0, 'log message');
```

Here, `0` is the index of the level (e.g., 'level test'), and `'log message'` is the message to be logged.

### Example Script

Here is an example script demonstrating the usage of LID:

```javascript
import lid from 'lid';

const logger = new lid(
    [
        {
            lvlName: 'level 1',
            tags: [
                {
                    tagName: 'tag 1',
                    tagMessage: 'tag 1 message'
                },
                {
                    tagName: 'tag 2',
                    tagMessage: 'tag 2 message'
                }
            ],
        },
        {
            lvlName: 'level 2',
            tags: [
                {
                    tagName: 'tag 1',
                    tagMessage: 'tag 1 message'
                },
            ]
        }
    ], {
        files: [
            'C:/one/two/three/lidtest/one.csv',
            'C:/one/two/three/lidtest/one.txt',
        ],
        tcpConnections: [{
            address: '127.0.0.1',
            port: 1342,
            secretKey: `examplePassword`,
        }],
        writeOnconsole: false,
        bufferedConnection: true,
    }
);

await logger.initializeConnections();

logger.log(0, 'example string', [
    {
        tagName: 'tag 1'
    },
    {
        tagName: 'dynamic tag 1',
        tagMessage: 'dynamic tag message'
    }, {
        tagName: 'dynamic tag 2',
        tagMessage: 'dynamic tag message'
    },
]);

logger.log(0, 'some string 2');

logger.log(1, 'some string 3');

logger.log(0, 'some string 4', [{
    tagName: 'tag 1',
    tagMessage: 'overwriting tag message 1'
}]);
```

## Configuration Options

*   **files**: Array of file paths where logs will be stored.
    
*   **tcpConnections**: Array of TCP connections to send logs to.
    
    *   **address**: IP address of the server.
        
    *   **port**: Port number of the server.
        
    *   **secretKey**: Secret key for authentication.
        
*   **writeOnconsole**: Boolean to enable or disable logging to the console.
    
*   **bufferedConnection**: Boolean to enable or disable buffered connections.
    

## Contributing

Contributions are welcome! Please open an issue or submit a pull request on GitHub.

## License

This project is licensed under the MIT License - see the [LICENSE](https://LICENSE) file for details.
