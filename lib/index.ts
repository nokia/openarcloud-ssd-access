/*
  (c) 2020 Open AR Cloud
  This code is licensed under MIT license (see LICENSE.md for details)

  (c) 2024 Nokia
  Licensed under the MIT License
  SPDX-License-Identifier: MIT
*/

/**
    Main access point to the spatial discovery services of the Open Spatial Computing Platform.
*/

import ssrService from './ssr.service.json';
import { z } from 'zod';
export * from './authstore';

export const bBox2dSchema = z.tuple([z.number(), z.number(), z.number(), z.number()]);

export const bBox3dSchema = z.tuple([z.number(), z.number(), z.number(), z.number(), z.number(), z.number()]);

export const positionSchema = z.array(z.number());

export const geometryTypesSchema = z.union([
    z.literal('Point'),
    z.literal('LineString'),
    z.literal('Polygon'),
    z.literal('MultiPoint'),
    z.literal('MultiLineString'),
    z.literal('MultiPolygon'),
    z.literal('GeometryCollection'),
]);

export const bBoxSchema = z.union([bBox2dSchema, bBox3dSchema]);

export const geoJSONObjectSchema = z.object({
    type: z.string(),
    bbox: bBoxSchema.optional(),
});

export const geometryObjectSchema = geoJSONObjectSchema.extend({
    type: geometryTypesSchema,
});

export const polygonSchema = geometryObjectSchema.extend({
    type: z.literal('Polygon'),
    coordinates: z.array(z.array(positionSchema)),
});

export const propertySchema = z.object({
    type: z.string(),
    value: z.string(),
});

export const serviceSchema = z.object({
    id: z.string(),
    type: z.string(),
    title: z.string(),
    description: z.string().optional(),
    url: z.string().url(),
    properties: z.array(propertySchema).optional(),
});

export const ssrSchema = z.object({
    id: z.string(),
    type: z.string(),
    services: z.array(serviceSchema),
    geometry: polygonSchema,
    altitude: z.number().optional(),
    provider: z.string(),
    timestamp: z.number(),
    active: z.boolean().optional(),
});

export type BBox2d = z.infer<typeof bBox2dSchema>;
export type BBox3d = z.infer<typeof bBox3dSchema>;
export type Position = z.infer<typeof positionSchema>;
export type GeometryTypes = z.infer<typeof geometryTypesSchema>;
export type BBox = z.infer<typeof bBoxSchema>;
export type GeoJSONObject = z.infer<typeof geoJSONObjectSchema>;
export type GeometryObject = z.infer<typeof geometryObjectSchema>;
export type Polygon = z.infer<typeof polygonSchema>;
export type Property = z.infer<typeof propertySchema>;
export type Service = z.infer<typeof serviceSchema>;
export type SSR = z.infer<typeof ssrSchema>;

// Allows to return local JSON response (only for debugging)
export let local = false;

export const ssr_schema = ssrSchema;
export const ssr_empty: SSR = {
    type: 'ssr',
    services: [],
    geometry: {
        type: 'Polygon',
        coordinates: [[]],
    },
    altitude: 0,
    provider: '',
    timestamp: 1702045310772,
    id: '',
};
export const ssr_service: Service = {
    id: '',
    type: '',
    url: '',
    title: '',
    description: '',
    properties: [],
};

/** Country lists already fetched, keyed by SSD base URL. */
const supportedCountriesByServer = new Map<string, string[]>();

export const availableServiceTypes = ['GeoPose', 'Content-Discovery', 'P2P-Master', 'Message-Broker'];

const SSD_URL_DEFAULT = 'https://dev1.ssd.oscp.cloudpose.io:7000';
const SSRS_PATH_DEFAULT = 'ssrs';

let ssdUrl = SSD_URL_DEFAULT; // base URL of Spatial Service Discovery
let ssrsPath = SSRS_PATH_DEFAULT; // subpath of Spatial Content Records on the SSD URL

const GET_METHOD = 'get';
const POST_METHOD = 'post';
const PUT_METHOD = 'put';
const DELETE_METHOD = 'delete';

export function setSsdUrl(url: string) {
    ssdUrl = url;
}

export function setSsrsPath(path: string) {
    ssrsPath = path;
}

function resolveBaseUrl(baseUrl?: string): string {
    const url = (baseUrl ?? ssdUrl).trim().replace(/\/+$/, '');
    if (url === '') {
        throw new Error('SSD URL is not set');
    }
    return url;
}

function parseCountryList(payload: unknown, url: string): string[] {
    if (!Array.isArray(payload) || payload.some((country) => typeof country !== 'string' || country.trim() === '')) {
        throw new Error(`GET ${url}/countries returned an invalid country list`);
    }
    return payload.map((country) => country.trim().toUpperCase());
}

/**
 * ISO country codes served by one SSD instance.
 *
 * `baseUrl` selects the server. When it is omitted, the URL from `setSsdUrl` is used.
 * Results are cached per server, so several SSD hosts keep separate lists.
 */
export async function getSupportedCountries(baseUrl?: string): Promise<string[]> {
    const url = resolveBaseUrl(baseUrl);
    const cached = supportedCountriesByServer.get(url);
    if (cached) {
        return [...cached];
    }

    const response = await request(`${url}/countries`);
    const countries = parseCountryList(await response.json(), url);
    supportedCountriesByServer.set(url, countries);
    return [...countries];
}

/**
 * Whether `country` is served by the SSD instance at `baseUrl` (or `setSsdUrl` when omitted).
 * Comparison is case-insensitive, matching the server's uppercasing of country path parameters.
 */
export async function isSupportedCountry(country: string, baseUrl?: string): Promise<boolean> {
    if (country === undefined || country.trim() === '') {
        return false;
    }
    const countries = await getSupportedCountries(baseUrl);
    return countries.includes(country.trim().toUpperCase());
}

/**
 * Requests the available services in the provided region and location
 *
 * The location to provide should be approximate, to prevent exposing exact client locations.
 *
 * When the global variable `local` is set to true, no server access is done, but a local result is returned instead.
 *
 */
export async function getServicesAtLocation(countryCode: string, h3Index: string): Promise<SSR[]> {
    if (local) {
        return localServices;
    }

    if (countryCode === undefined || countryCode === '' || h3Index === undefined || h3Index === '') {
        throw new Error(`Check parameters: ${countryCode} ${h3Index}`);
    }

    const response = await request(`${ssdUrl}/${countryCode}/${ssrsPath}?h3Index=${h3Index}`);
    return await response.json();
}

/**
 * Requests the service with the provided id from the provided region
 *
 * When the global variable `local` is set to true, no server access is done, but a local result is returned instead.
 */
export async function getServiceWithId(countryCode: string, id: string): Promise<SSR> {
    if (local) {
        return localService;
    }

    if (id === undefined || id.length < 16) {
        throw new Error(`Check parameters: ${id}`);
    }

    const response = await request(`${ssdUrl}/${countryCode}/${ssrsPath}/${id}`);
    return await response.json();
}

/**
 * Request all services in the provided region.
 */
export async function searchServicesForProducer(countryCode: string, token: string): Promise<SSR[]> {
    const response = await request(`${ssdUrl}/${countryCode}/provider/${ssrsPath}`, GET_METHOD, '', token);
    const data = await response.json();
    return data;
}

/**
 * Post a single service record (SSR) to the server in the provided region
 *
 * Accepts an SSR object or a JSON string (string form kept for one-release compatibility).
 * `token` may be empty when the backend runs with auth disabled.
 *
 * When the global variable `local` is set to true, no server access is done, but an immediate ok returned.
 */
export async function postService(countryCode: string, ssr: SSR | string, token: string = ''): Promise<string> {
    if (local) {
        return 'OK';
    }

    const body = typeof ssr === 'string' ? ssr : JSON.stringify(ssr);
    if (ssr === undefined || body.length === 0) {
        throw new Error(`Check parameters: ${ssr}, ${token}`);
    }

    const response = await request(`${ssdUrl}/${countryCode}/${ssrsPath}`, POST_METHOD, body, token);
    return await response.text();
}

/**
 * Post the content of a .json file to the server in the provided region
 *
 * Reads the contents of the file, validates it against a json schema and posts it to the server.
 */
export async function postSsrFile(countryCode: string, file: File, token: string): Promise<string> {
    const result = await getFileContent(file);
    validateSsr(result, file.name);
    return await postService(countryCode, result, token);
}

/**
 * Put a single service record (SSR) to the server in the provided region
 *
 * Accepts an SSR object or a JSON string (string form kept for one-release compatibility).
 * `token` may be empty when the backend runs with auth disabled.
 */
export async function putService(countryCode: string, ssr: SSR | string, id: string, token: string = ''): Promise<string> {
    if (local) {
        return 'OK';
    }

    const body = typeof ssr === 'string' ? ssr : JSON.stringify(ssr);
    if (ssr === undefined || body.length === 0 || id === undefined || id.length === 0) {
        throw new Error(`Check parameters: ${ssr}, ${id} ${token}`);
    }

    const response = await request(`${ssdUrl}/${countryCode}/${ssrsPath}/${id}`, PUT_METHOD, body, token);
    return await response.text();
}

/**
 * Delete service with provided ID
 */
export async function deleteWithId(countryCode: string, id: string, token: string) {
    const response = await request(`${ssdUrl}/${countryCode}/${ssrsPath}/${id}`, DELETE_METHOD, '', token);
    return await response.text();
}

/**
 * Validate the provided SSR against a json schema
 */
export function validateSsr(scr: string, fileName = '') {
    try {
        ssrSchema.parse(JSON.parse(scr));
        return true;
    } catch (error) {
        throw new Error(`Unable to parse file content: ${fileName}, ${error}`);
    }
}

/**
 * Executes the actual request
 */
async function request(url: string, method = GET_METHOD, body = '', token: string | undefined = undefined) {
    let headers = new Headers();
    // The OSCP type should be application/vnd.oscp+json; version=1.0, but we also accept application/json
    // to be compatible with older SSD services.
    headers.append('accept', 'application/json, application/vnd.oscp+json; version=1.0');
    headers.append('content-type', 'application/json');

    if (token) {
        headers.append('authorization', `Bearer ${token}`);
    }

    const options = {
        method: method,
        headers: headers,
        ...(method === POST_METHOD || method === PUT_METHOD ? { body } : undefined),
    };

    const response = await fetch(url, options);
    if (!response.ok) {
        const detail = await response.text();
        throw new Error(
            `${method.toUpperCase()} ${url} failed (${response.status} ${response.statusText})${detail ? `: ${detail}` : ''}`,
        );
    }
    return response;
}

/**
 * Read the contents of the provided text file
 */
function getFileContent(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
        if (file === undefined) {
            reject('Undefined file provided');
        }

        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = () => {
            reader.abort();
            reject(`Unable to get Content of ${file.name}: ${reader.error}`);
        };

        reader.readAsText(file);
    });
}

/** Local SSR records for testing */
export const localServices: SSR[] = [
    {
        id: 'e32ca955c776ecec',
        type: 'ssr',
        services: [
            { type: 'geopose', url: 'http://geopose.geo1.example.com', id: 'geopose-id', title: 'geopose-title' },
            { type: 'content-discovery', url: 'http://content-discovery.geo1.example.com', id: 'content-discovery-id', title: 'content-discovery-title' },
        ],
        geometry: {
            type: 'Polygon',
            coordinates: [
                [
                    [-97.74437427520752, 30.27830380593801],
                    [-97.73051261901855, 30.28590104010804],
                    [-97.74703502655028, 30.291014944499693],
                    [-97.74437427520752, 30.27830380593801],
                ],
            ],
        },
        provider: 'oscptest',
        timestamp: 1597208890824,
    },
    {
        id: 'e0f25f91555e0fba',
        type: 'ssr',
        services: [
            { type: 'geopose', url: 'http://geopose.geo1.example.com', id: 'geopose-id', title: 'geopose-title' },
            { type: 'content-discovery', url: 'http://content-discovery.geo1.example.com', id: 'content-discovery-id', title: 'content-discovery-title' },
        ],
        geometry: {
            type: 'Polygon',
            coordinates: [
                [
                    [-97.73042678833008, 30.283677520264256],
                    [-97.73102760314941, 30.28193572785586],
                    [-97.72969722747803, 30.2815280698483],
                    [-97.72901058197021, 30.28356634294924],
                    [-97.73042678833008, 30.283677520264256],
                ],
            ],
        },
        provider: 'oscptest',
        timestamp: 1597208916344,
    },
];

/** Local SSR record for testing */
export const localService: SSR = {
    id: 'e32ca955c776ecec',
    type: 'ssr',
    services: [
        { type: 'geopose', url: 'http://geopose.geo1.example.com', id: 'geopose-id', title: 'geopose-title' },
        { type: 'content-discovery', url: 'http://content-discovery.geo1.example.com', id: 'content-discovery-id', title: 'content-discovery-title' },
    ],
    geometry: {
        type: 'Polygon',
        coordinates: [
            [
                [-97.74437427520752, 30.27830380593801],
                [-97.73051261901855, 30.28590104010804],
                [-97.74703502655028, 30.291014944499693],
                [-97.74437427520752, 30.27830380593801],
            ],
        ],
    },
    provider: 'oscptest',
    timestamp: 1597208890824,
};
