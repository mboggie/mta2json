# mta2json - mboggie fork
Proxies requests to the MTA for realtime transit feed data, filters out just the vehicle locations, augments the data with additional information (location, time expansions, ENUM conversions, etc.) and returns results as JSON.

Designed to be used as a source in [streamtools](https://github.com/nytlabs/streamtools) using a getHttp block.

## Configuration
Set the following as environment variables:

  * `MTA_KEY` your MTA API KEY
  * `FEED_ID` the ID of the feed you want from the MTA (optional)  
    - Main feed is `0`, which we will use by default.
    - New feed with the L train is `2`.
  * `PORT` if you wish to override the default port we listen on (3000)

`Dotenv.load()` is automatic so we'll source these from a standard `.env` file if it exists.
