export interface YStation {
    constellationID: number, corporationID: number, dockingCostPerVolume: number, maxShipVolumeDockable: number, officeRentalCost: number, operationID: number, regionID: number, reprocessingEfficiency: number, reprocessingHangarFlag: number, reprocessingStationsTake: number, security: number, solarSystemID: number, stationID: number, stationName: string, stationTypeID: number, x: number, y: number, z: number;
}

export interface IOIndex {
    regionID: number;
    orders: IEVEOrder[];
}

export interface IItem { inventoryIndex: number, capped: string, forBuy: number, canSell: number, turnOver: number, buyPrice: number, sellPrice: number, profit: number }
export interface IResult { stationID: number; items: IItem[]; }

// Xhr
export interface IAPIRequest {
    headers?: {}, method?: string, url: string, data?: string
}

export interface IXhrResponse<T> {
    status: number;
    statusText: string;
    data: T;
}

// IEVE (crest api)
export interface IEVE {
    totalCount: number, totalCount_str: string, pageCount: number, pageCount_str: string, next: { href: string }
}

export interface IEVEConstellation {
    name: string,
    position: { x: number, y: number, z: number },
    region: { href: string },
    systems: { href: string, id: number, id_str: string }[]
}

export interface IEVEInventory {
    capacity: number, description: string, portionSize_str: string, iconID: number, portionSize: number, iconID_str: string, volume: number, radius: number, id_str: string, published: boolean, mass: number, id: number, name: string;
}

export interface IEVEStation {
    reprocessingEfficiency: number,
    officeRentalCost: number,
    maxShipVolumeDockable: number,
    reprocessingStationsTake: number,
    system: { href: string, name: string },
    services: { serviceName: string }[],
    race: { href: string, id: number, id_str: string },
    owner: { href: string },
    position: { y: number, x: number, z: number },
    type: { href: string },
    name: string
}

export interface IEVEStargate {
    name: string,
    position: { x: number, y: number, z: number },
    destination: { system: { id_str: string, href: string, id: number, name: string }, stargate: { id_str: string, href: string, id: number, name: string } },
    system: { id_str: string, href: string, id: number, name: string },
    type: { id_str: string, href: string, id: number, name: string }
}

export interface IEVESolarSystem {
    id: number,
    id_str: string,
    name: string,
    stats: { href: string },
    planets: { href: string, moons: { href: string }[] }[],
    stargates: { id: number, id_str: string, href: string, name: string }[],
    securityClass: string,
    href: string,
    securityStatus: number,
    position: { x: number, y: number, z: number },
    constellation: { id: number, id_str: string, href: string }
}

export interface IEVEMarketType {
    id: number,
    id_str: string,
    marketGroup: { href: string, id: number, id_str: string },
    type: { name: string, href: string, icon: { href: string }, id: number, id_str: string }
}

export interface IEVEMarketTypes extends IEVE {
    items: IEVEMarketType[];
}

export interface IEVERegion {
    name: string,
    description: string,
    marketBuyOrders: { href: string },
    marketHistory: { href: string },
    constellation: { href: string, id: number, id_str: string }[],
    marketOrders: { href: string },
    id_str: string,
    marketOrdersAll: { href: string },
    id: number,
    marketSellOrders: { href: string }
}

export interface IEVEOrder {
    buy: boolean, issued: Date, price: number, volume: number, duration: number, id: number, volumeEntered: number, minVolume: number, range: string, stationID: number, type: number;
}
export interface IEVEOrders extends IEVE {
    items: IEVEOrder[];
}

