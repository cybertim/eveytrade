import { IAPIRequest, IXhrResponse } from './shared';
import { constellationInfo } from './api';
import * as jsyaml from 'js-yaml';

const TIMEOUT = 60000; // 60 sec.

export function Yaml<T>(location: string): Promise<T> {
    return new Promise((resolve, reject) => {
        let req = new XMLHttpRequest();
        req.open('GET', location);
        req.timeout = TIMEOUT;
        req.setRequestHeader('Content-Type', 'application/json;charset=UTF-8');
        req.onreadystatechange = () => {
            if (!req || req.readyState !== 4 || req.status === 0) return;
            try {
                resolve(<T>jsyaml.safeLoad(req.responseText));
            } catch (e) {
                reject(e);
            }
        }
        req.send({});
    });
}

export function Xhr<T>(request: IAPIRequest): Promise<IXhrResponse<T>> {
    return new Promise((resolve, reject) => {
        const req = new XMLHttpRequest();
        req.open(request.method.toLowerCase(), request.url);
        req.ontimeout = () => {
            reject('timeout of ' + TIMEOUT + 'ms exceeded');
        }
        req.onerror = () => {
            reject('connection error');
        }
        req.timeout = TIMEOUT;
        req.setRequestHeader('Content-Type', 'application/json;charset=UTF-8');
        for (let key in request.headers) {
            req.setRequestHeader(key, request.headers[key]);
        }
        req.onreadystatechange = () => {
            if (!req || req.readyState !== 4 || req.status === 0) return;
            resolve({
                status: req.status,
                statusText: req.statusText,
                data: JSON.parse(req.responseText)
            });
        }
        req.send(JSON.stringify(request.data));
    });
}
