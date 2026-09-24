Simple client library for the Open AR Cloud Spatial Service Discovery.
More information about the discovery services used can be found here:

Spatial Service Discovery
- [https://github.com/OpenArCloud/oscp-spatial-service-discovery](https://github.com/OpenArCloud/oscp-spatial-service-discovery)

Spatial Content Discovery
- [https://github.com/OpenArCloud/oscp-spatial-content-discovery](https://github.com/OpenArCloud/oscp-spatial-content-discovery)


### New with version 0.4.1:
- Requests accept `application/json` as well as `application/vnd.oscp+json; version=1.0`, so gateways that reject the vendor type alone still return service records.
- Failed requests include the method, URL, status, and response body.

### New with version 0.4.0:
- Optional no-auth/dev `init` (empty or `"disabled"` Auth0 settings)
- Svelte is a peer dependency; Svelte 4 and Svelte 5 are supported

### New with version 0.3.0:
- **Breaking changes**
- conversion from JavaScript to TypeScript

### New with version 0.2.10:
- message-broker service type defined

### New with version 0.2.5-9:
- schema validation updates

### New with version 0.2.4:
- more countries defined, p2p-master service type defined

### New with version 0.2.2:
- Auth0 context must be set from the application that calls this library

### New with version 0.2.1:
- `SSD_URL` and `SSRS_PATH` can be set from outside the library

### New with version 0.2.0:
- Implementing changes from SSD
- Breaking: Rename service property `capabilities` to `properties`
- Add new property `active`


### Currently available functions are:
    function getServicesAtLocation(countryCode, h3Index)
Requests services available around H3Index from the regional server for the provided countryCode

    function getServiceWithId(countryCode, id)
Requests service with provided id from the regional server for the provided countryCode

    function postService(countryCode, ssr, token)
Post a service to Spatial Services Discovery server of provided region

    function postSsrFile(countryCode, file, token)
Post the content of a .json file to Spatial Services Discovery server of provided region

    function putService(countryCode, ssr, id, token)
Send an edited SSR record to the server

    function validateSsr(ssr, fileName = '')
Validate the provided Spatial Services Record against the SSR json schema

    function searchServicesForProducer(countryCode, token)
Request all services for the current tenant in the provided region

    function deleteWithId(countryCode, id, token)
Delete the record with the provided id and region


### Authentication

The spatial discovery services use [Auth0](https://auth0.com/) for authentication. This library uses the [single page app SDK](https://auth0.com/docs/libraries/auth0-single-page-app-sdk) from Auth0. In your main application, you can read the Auth0 configuration from a .env file containing these values:
```
AUTH0_SSD_DOMAIN =
AUTH0_SSD_CLIENTID =
AUTH0_SSD_AUDIENCE =
AUTH0_SSD_SCOPE =
```
and then you can pass these values to this library in the `init` method:

    function init(auth_domain, auth_client_id, auth_audience, auth_scope))
Instantiate and initialize the auth0 object, used for login/logout and api access

    function login()
    function logout()

    function getToken()
Returns the auth0 access token

    authenticated
true when client is logged in

    user
The user record from auth0


### More information about the discovery services used can be found here:

Spatial Service Discovery
- https://github.com/OpenArCloud/oscp-spatial-service-discovery/

Spatial Content Discovery
- https://github.com/OpenArCloud/oscp-spatial-content-discovery

Admin Sample, uses this module
- https://github.com/OpenArCloud/oscp-admin
