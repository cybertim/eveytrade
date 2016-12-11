import { IEVEOrder } from './xhr';

export interface YStation {
    constellationID: number, corporationID: number, dockingCostPerVolume: number, maxShipVolumeDockable: number, officeRentalCost: number, operationID: number, regionID: number, reprocessingEfficiency: number, reprocessingHangarFlag: number, reprocessingStationsTake: number, security: number, solarSystemID: number, stationID: number, stationName: string, stationTypeID: number, x: number, y: number, z: number;
}

export interface IOIndex {
    regionID: number;
    orders: IEVEOrder[];
}

export interface IItem { inventoryIndex:number, forBuy: number, canSell: number, turnOver: number, buyPrice: number, sellPrice: number, profit: number }
export interface IResult { stationID: number; items: IItem[]; }

