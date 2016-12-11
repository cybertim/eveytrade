import { IItem, IOIndex, IResult, YStation } from './shared';
import { constellationInfo, inventoryInfo, marketOrders, regionByHref, solarSystemInfo, stargateInfo, typeInfo } from './api';
import { IEVEInventory, IEVEMarketType, IEVEOrder, IEVESolarSystem, Yaml } from './xhr';

const buttonSearch = <HTMLButtonElement>document.getElementById('button-search');
const inputStation = <HTMLInputElement>document.getElementById('input-station');
const inputCargo = <HTMLInputElement>document.getElementById('input-cargo');
const inputISK = <HTMLInputElement>document.getElementById('input-isk');
const inputJumps = <HTMLInputElement>document.getElementById('input-jumps');
// const inputSecurity = <HTMLInputElement>document.getElementById('input-security');
const divProgress = <HTMLDivElement>document.getElementById('search-progress');

// Global Data Collections
let inventory: IEVEInventory[] = [];
let totalJumps: number;
let stationData: YStation[] = null;

async function initializeStationSearch() {
    stationData = await Yaml<YStation[]>('data/staStations.yaml');
    let list = [];
    stationData.forEach(station => {
        list.push(station.stationName);
    });
    inputStation.dataset['source'] = JSON.stringify(list);
}
initializeStationSearch();

buttonSearch.onclick = (ev) => {
    buttonSearch.disabled = true; // disable multiple clicks
    let station: YStation = null;
    stationData.forEach(s => {
        if (s.stationName === inputStation.value) station = s;
    });
    // do a search...
    if (station !== null) doSearch(station);
    else buttonSearch.disabled = false; // wrong input.
};

export class Results {
    private _results: IResult[];

    constructor() {
        this._results = [];
    }

    public async add(stationID: number, item: IItem) {
        let match = false;
        this._results.forEach(_result => {
            if (_result.stationID === stationID) {
                _result.items.push(item);
                match = true;
            }
        });
        if (!match) {
            this._results.push({
                stationID: stationID,
                items: [item]
            })
        }
        return match;
    }

    public amount(): number {
        return this._results.length;
    }

    public show() {
        this._results.forEach(_result => {
            this.createPanel(_result);
        });
    }

    private createPanel(result: IResult) {
        const panel = document.createElement('div');
        const head = document.createElement('div');
        const table = document.createElement('table');
        const tbody = document.createElement('tbody');
        table.className = "table table-hover";
        panel.className = "panel panel-default";
        head.className = "panel-heading";
        let station: YStation = null;
        stationData.forEach(_station => { if (result.stationID === _station.stationID) station = _station });
        head.textContent = station.stationName;
        panel.appendChild(head); // add header
        result.items.forEach(_item => {
            const row = document.createElement('tr');
            const img = document.createElement('img');
            img.src = 'http://imageserver.eveonline.com/Type/' + inventory[_item.inventoryIndex].id + '_32.png'
            this.addTableData(row, img);
            this.addTableData(row, inventory[_item.inventoryIndex].name);
            this.addTableData(row, 'M3 total ' + (_item.turnOver * inventory[_item.inventoryIndex].volume).toFixed(2));
            this.addTableData(row, _item.forBuy + ' Supply, ' + _item.canSell + ' Demand');
            this.addTableData(row, _item.buyPrice.toFixed(2) + ' ISK pp, ' + (_item.turnOver * _item.buyPrice).toFixed(2) + ' ISK max');
            this.addTableData(row, _item.profit.toFixed(2) + ' ISK pp, ' + (_item.turnOver * _item.profit).toFixed(2) + ' ISK max');
            tbody.appendChild(row);
        });
        table.appendChild(tbody);
        panel.appendChild(table);
        document.getElementById('results-container').appendChild(panel);
    }

    private addTableData(row: HTMLTableRowElement, data: string | HTMLElement) {
        const td = document.createElement('td');
        if (data instanceof HTMLElement) td.appendChild(data);
        else td.textContent = data;
        row.appendChild(td);
    }
}

async function recursiveOrderCollector(currentStationID: number, solarSystem: IEVESolarSystem, systemIndex: number[], orderIndex: IOIndex[], jumps: number) {
    let collection: IEVEOrder[] = [];
    if (jumps !== 0) {
        for (let i = 0; i < solarSystem.stargates.length; i++) {
            // process... call solarsystem of stargates with less jumps
            const stargate = await stargateInfo(solarSystem.stargates[i].id);
            const system = await solarSystemInfo(stargate.destination.system.id);
            // check if the solarsystem was already processed
            if (systemIndex.indexOf(system.id) === -1) {
                systemIndex.push(system.id);
                // new solar system - add it to the recursion of a jump
                divProgress.textContent = 'Analyzing Jump through gate ' + stargate.name + ' to ' + system.name + ' [' + (totalJumps - jumps + 1) + '/' + totalJumps + ']';
                collection = collection.concat(await recursiveOrderCollector(currentStationID, system, systemIndex, orderIndex, jumps - 1));
            } else {
                console.log('stargate', stargate.name, 'goes to same system', system.name);
            }
        }
    }
    const constellation = await constellationInfo(solarSystem.constellation.id);
    const region = await regionByHref(constellation.region.href);
    let orders: IEVEOrder[] = null;
    for (let i = 0; i < orderIndex.length; i++) {
        if (orderIndex[i].regionID === region.id) orders = orderIndex[i].orders;
    }
    // region not yet added - create the index
    if (orders === null) {
        orders = await marketOrders(region.id, (c, t) => {
            divProgress.textContent = 'Indexing region ' + region.name + ' [' + c + '/' + t + ']';
        });
        console.log('!orders found', orders.length, 'in', region.name);
        orderIndex.push({ regionID: region.id, orders: orders });
    }
    const stationsInSolar = stationData.filter(_station => {
        return (_station.solarSystemID === solarSystem.id && _station.stationID !== currentStationID);
    }).map(_station => { return _station.stationID });
    // return filtered orders for solarsystem
    collection = collection.concat(orders.filter(order => {
        return (stationsInSolar.indexOf(order.stationID) > -1 && order.buy);
    }));
    return collection;
}

async function doSearch(station: YStation) {
    try {
        // initialize all indexes
        divProgress.className = 'progress-bar progress-bar-striped active';
        divProgress.textContent = 'Initializing...';
        totalJumps = Number.parseInt(inputJumps.value);
        const results = new Results();
        let jumps = Number.parseInt(inputJumps.value);
        let ioIndex: IOIndex[] = [];
        let isIndex: number[] = [];
        // getlocal soalrsystem (ignore current station - buy only) and all recursive jump orders
        const solarSystem = await solarSystemInfo(station.solarSystemID);
        const orders = await recursiveOrderCollector(station.stationID, solarSystem, isIndex, ioIndex, jumps);
        // select the local order list for this region
        let localOrders: IEVEOrder[] = null;
        for (let i = 0; i < ioIndex.length; i++) {
            if (ioIndex[i].regionID === station.regionID) localOrders = ioIndex[i].orders;
        }
        const stationSellOrders = localOrders.filter(_order => {
            return (_order.stationID === station.stationID && !_order.buy);
        });
        // mix'n'match
        for (let i = 0; i < stationSellOrders.length; i++) {
            divProgress.textContent = 'Mix\'n\'Match [' + i + '/' + stationSellOrders.length + ']';
            const sellOrder = stationSellOrders[i];
            let type = null; // reset type resolve
            for (let j = 0; j < orders.length; j++) {
                const buyOrder = orders[j];
                if (sellOrder.type === buyOrder.type && sellOrder.price < buyOrder.price) {
                    let tmatch: number = -1; // type index number in cache
                    for (let i = 0; i < inventory.length; i++) {
                        if (inventory[i].id === sellOrder.type) tmatch = i;
                    }
                    if (tmatch === -1) {
                        tmatch = inventory.push(await inventoryInfo(sellOrder.type));
                        tmatch--;
                    }
                    await results.add(buyOrder.stationID, {
                        forBuy: sellOrder.volume,
                        canSell: buyOrder.volume,
                        turnOver: (buyOrder.volume - sellOrder.volume < 0) ? buyOrder.volume : sellOrder.volume,
                        buyPrice: sellOrder.price,
                        sellPrice: buyOrder.price,
                        profit: (buyOrder.price - sellOrder.price),
                        inventoryIndex: tmatch
                    });
                }
            }
        }
        results.show();
        divProgress.className = 'progress-bar progress-bar-success';
        divProgress.textContent = 'Found ' + results.amount() + ' Results.';
    } catch (e) {
        divProgress.className = 'progress-bar progress-bar-danger';
        divProgress.textContent = 'Failed: ' + e;
        console.error(e);
    } finally {
        buttonSearch.disabled = false;
    }
}
