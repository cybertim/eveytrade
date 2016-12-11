import { IEVEConstellation, IEVEInventory, IEVEMarketType, IEVEOrder, IEVEOrders, IEVERegion, IEVESolarSystem, IEVEStargate, IEVEStation, IXhrResponse, Xhr } from './xhr';

const BASE = 'https://crest-tq.eveonline.com/';

// Loop through all pages of market orders for this region
export async function marketOrders(regionId: number, update: (pos: number, total: number) => void) {
    let orders: IEVEOrder[] = [];
    let count = 1;
    let _continue = true;
    while (_continue) {
        const r = await Xhr<IEVEOrders>({ method: 'GET', url: BASE + 'market/' + regionId + '/orders/all/?page=' + count });
        orders = orders.concat(r.data.items);
        count++;
        if (count > r.data.pageCount) _continue = false;
        update(count - 1, r.data.pageCount);
    }
    return orders;
}

export async function stargateInfo(stargateID: number) {
    const r = await Xhr<IEVEStargate>({ method: 'GET', url: BASE + 'stargates/' + stargateID + '/' });
    return r.data;
}

// get live solarSystem information about the station
export async function solarSystemInfo(solarSystemID: number) {
    const r = await Xhr<IEVESolarSystem>({ method: 'GET', url: BASE + 'solarsystems/' + solarSystemID + '/' });
    return r.data;
}

export async function constellationInfo(constellationID: number) {
    const r = await Xhr<IEVEConstellation>({ method: 'GET', url: BASE + 'constellations/' + constellationID + '/' });
    return r.data;
}

export async function regionByHref(href: string) {
    const r = await Xhr<IEVERegion>({ method: 'GET', url: href });
    return r.data;
}

// get the type for more details
export async function typeInfo(typeId: number) {
    const r = await Xhr<IEVEMarketType>({ method: 'GET', url: BASE + 'market/types/' + typeId + '/' });
    return r.data;
}

// get information about the station online
export async function stationInfo(stationId: number) {
    const r = await Xhr<IEVEStation>({ method: 'GET', url: BASE + 'stations/' + stationId + '/' });
}

export async function inventoryInfo(typeId: number) {
    const r = await Xhr<IEVEInventory>({ method: 'GET', url: BASE + 'inventory/types/' + typeId + '/' });
    return r.data;
}
