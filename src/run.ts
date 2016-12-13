import { Yaml } from './xhr';
import { IEVEInventory, IEVEOrder, IEVESolarSystem, IItem, IOIndex, IResult, YStation } from './shared';
import { constellationInfo, inventoryInfo, marketOrders, regionByHref, solarSystemInfo, stargateInfo, typeInfo } from './api';

const MAX_RESULTS = 5; // max results per station

const buttonSearch = <HTMLButtonElement>document.getElementById('button-search');
const inputStation = <HTMLInputElement>document.getElementById('input-station');
const inputCargo = <HTMLInputElement>document.getElementById('input-cargo');
const inputISK = <HTMLInputElement>document.getElementById('input-isk');
const inputProfit = <HTMLInputElement>document.getElementById('input-profit');
const inputJumps = <HTMLInputElement>document.getElementById('input-jumps');
const checkboxSolar = <HTMLInputElement>document.getElementById('solarsystem-checkbox');

// const inputSecurity = <HTMLInputElement>document.getElementById('input-security');
const divProgress = <HTMLDivElement>document.getElementById('search-progress');

// Global Data Collections
let inventory: IEVEInventory[] = [];
let totalJumps: number;
let stationData: YStation[] = null;

async function initializeStationSearch() {
    stationData = await Yaml<YStation[]>('https://gist.githubusercontent.com/cybertim/84737815c96e49c7f4509ba10d927dc4/raw/c48763ced6a1eb9b04eec49a4ee3aab5402215c9/staStations.yaml');
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

    public async add(targetStationID: number, sourceStationID: number, item: IItem) {
        let match = false;
        this._results.forEach(_result => {
            if (_result.targetStationID === targetStationID && _result.sourceStationID === sourceStationID) {
                _result.items.push(item);
                match = true;
            }
        });
        if (!match) {
            this._results.push({
                targetStationID: targetStationID,
                sourceStationID: sourceStationID,
                items: [item]
            })
        }
        return match;
    }

    public amount(): number {
        return this._results.length;
    }

    public show() {
        const resultDiv = document.getElementById('results-container');
        for (let i = resultDiv.childNodes.length - 1; i >= 0; i--) {
            resultDiv.removeChild(resultDiv.childNodes.item(i));
        }
        this._results.forEach(_result => {
            this.createPanel(_result, resultDiv);
        });
    }

    private createPanel(result: IResult, parent: HTMLElement) {
        const panel = document.createElement('div');
        const head = document.createElement('div');
        const table = document.createElement('table');
        const tbody = document.createElement('tbody');
        table.className = "table table-hover";
        panel.className = "panel panel-default";
        head.className = "panel-heading";
        let targetStation: YStation = null;
        let sourceStation: YStation = null;
        stationData.forEach(_station => {
            if (result.targetStationID === _station.stationID) targetStation = _station;
            if (result.sourceStationID === _station.stationID) sourceStation = _station;
        });
        head.textContent = sourceStation.stationName + ' ' + sourceStation.security.toFixed(1) + ' ⇨ ' + targetStation.stationName + ' ' + targetStation.security.toFixed(1);
        panel.appendChild(head); // add header
        const sortedItems = result.items.sort((a, b) => { return a.profit - b.profit }).reverse();
        for (let i = 0; i < sortedItems.length; i++) {
            if (i >= MAX_RESULTS) break;
            const _item = sortedItems[i];
            const row = document.createElement('tr');
            const img = document.createElement('img');
            img.src = 'http://imageserver.eveonline.com/Type/' + inventory[_item.inventoryIndex].id + '_32.png'
            img.style.height = '16px';
            img.style.width = '16px';
            this.addTableData(row, img);
            this.addTableData(row, inventory[_item.inventoryIndex].name + ' (x' + _item.forBuy + ' ' + _item.buyPrice.toFixed(2) + ' ISK)');
            this.addTableData(row, 'Cargo ' + (_item.turnOver * inventory[_item.inventoryIndex].volume).toFixed(2) + 'm³ (' + _item.turnOver + 'x' + inventory[_item.inventoryIndex].volume + 'm³)');
            this.addTableData(row, 'Costs ' + (_item.turnOver * _item.buyPrice).toFixed(2) + ' ISK');
            this.addTableData(row, 'Profit ' + _item.profit.toFixed(2) + ' ISK [-2%]');
            this.addTableData(row, _item.capped, 'red');
            tbody.appendChild(row);
        }
        table.appendChild(tbody);
        panel.appendChild(table);
        parent.appendChild(panel);
    }

    private addTableData(row: HTMLTableRowElement, data: string | HTMLElement, color?: string) {
        const td = document.createElement('td');
        if (color) td.style.color = color;
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
                divProgress.textContent = 'Analyzing Jump through gate ' + stargate.type.name + ' to ' + system.name + ' [' + (totalJumps - jumps + 1) + '/' + totalJumps + ']';
                collection = collection.concat(await recursiveOrderCollector(currentStationID, system, systemIndex, orderIndex, jumps - 1));
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
        orderIndex.push({ regionID: region.id, orders: orders });
    }
    const stationsInSolar = stationIDsInSolarSystem(solarSystem.id, currentStationID);
    // return filtered orders for solarsystem
    return collection.concat(orders.filter(order => {
        return (stationsInSolar.indexOf(order.stationID) > -1 && order.buy);
    }));
}

function stationIDsInSolarSystem(solarSystemID: number, currentStationID: number) {
    return stationData.filter(_station => {
        return (_station.solarSystemID === solarSystemID && _station.stationID !== currentStationID);
    }).map(_station => { return _station.stationID });
}

async function doSearch(station: YStation) {
    try {
        // initialize all indexes
        divProgress.className = 'progress-bar progress-bar-striped active';
        divProgress.textContent = 'Initializing...';
        totalJumps = Number.parseInt(inputJumps.value);
        const results = new Results();
        let wholeSolar = checkboxSolar.checked;
        let jumps = Number.parseInt(inputJumps.value);
        let minProfit = Number.parseInt(inputProfit.value);
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
        const stationsInSolar = stationIDsInSolarSystem(station.solarSystemID, station.stationID);
        const localSellOrders = localOrders.filter(_order => {
            if (_order.stationID === station.stationID && !_order.buy) return true;
            if (wholeSolar && stationsInSolar.indexOf(_order.stationID) > -1 && !_order.buy) return true;
            return false;
        });
        // mix'n'match
        for (let i = 0; i < localSellOrders.length; i++) {
            if (i % 500 === 0) divProgress.textContent = 'Mix\'n\'Match [' + i + '/' + localSellOrders.length + ']';
            const sellOrder = localSellOrders[i];
            let type = null; // reset type resolve
            for (let j = 0; j < orders.length; j++) {
                const buyOrder = orders[j];
                if (sellOrder.type === buyOrder.type && sellOrder.price < buyOrder.price) {
                    // select and cache the inventory typeId
                    let tmatch: number = -1;
                    for (let i = 0; i < inventory.length; i++) {
                        if (inventory[i].id === sellOrder.type) tmatch = i;
                    }
                    if (tmatch === -1) {
                        tmatch = inventory.push(await inventoryInfo(sellOrder.type));
                        tmatch--;
                    }
                    // calculate the maxium turnOver based on the filter (isk and cargo space)
                    let capped = '';
                    let cargoSpace = Number.parseInt(inputCargo.value);
                    let iskAtHand = Number.parseInt(inputISK.value);
                    let turnOver = (buyOrder.volume - sellOrder.volume < 0) ? buyOrder.volume : sellOrder.volume;
                    if ((turnOver * inventory[tmatch].volume) > cargoSpace) {
                        turnOver = cargoSpace / inventory[tmatch].volume;
                        capped = 'cargo space'
                    }
                    if ((turnOver * sellOrder.price) > iskAtHand) {
                        turnOver = iskAtHand / sellOrder.price;
                        capped = 'isk at hand'
                    }
                    turnOver = Math.floor(turnOver);
                    // add (if there is a turnover possible) item to results
                    let profit = (turnOver * (buyOrder.price - sellOrder.price));
                    profit = (profit - ((100 / profit) * 2));
                    if (turnOver > 0 && profit >= minProfit) {
                        await results.add(buyOrder.stationID, sellOrder.stationID, {
                            forBuy: sellOrder.volume,
                            canSell: buyOrder.volume,
                            turnOver: turnOver,
                            buyPrice: sellOrder.price,
                            sellPrice: buyOrder.price,
                            profit: profit,
                            inventoryIndex: tmatch,
                            capped: capped
                        });
                    }
                }
            }
        }
        results.show();
        divProgress.className = 'progress-bar progress-bar-success';
        divProgress.textContent = 'Found ' + results.amount() + ' Result(s)';
    } catch (e) {
        divProgress.className = 'progress-bar progress-bar-danger';
        divProgress.textContent = 'Failed: ' + e;
        console.error(e);
    } finally {
        buttonSearch.disabled = false;
    }
}
