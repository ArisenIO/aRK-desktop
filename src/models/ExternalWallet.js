import IdGenerator from '../util/IdGenerator';
import ecc from 'arisenjs-ecc'

import {Blockchains} from './Blockchains'
import LedgerWallet from './hardware/LedgerWallet';
import APocketRSN from './hardware/APocket';

export const EXT_WALLET_TYPES = {
    LEDGER:'Ledger Nano S',
    APOCKET_RSN:'Arisen DIY Hardware Wallet'
};

export const EXT_WALLET_TYPES_ARR = Object.keys(EXT_WALLET_TYPES).map(x => EXT_WALLET_TYPES[x]);

export default class ExternalWallet {

    constructor(_type = EXT_WALLET_TYPES.LEDGER, _blockchain = Blockchains.ARISEN){
        this.id = IdGenerator.text(64);
        this.type = _type;
        this.blockchain = _blockchain;
        this.interface = getInterface(_type, _blockchain);
    }

    static placeholder(){ return new ExternalWallet(); }
    static fromJson(json){
        let p = Object.assign(this.placeholder(), json);
        p.interface = getInterface(p.type, p.blockchain);
        return p;
    }
}

const getInterface = (type, blockchain) => {
    switch(type){
        case EXT_WALLET_TYPES.LEDGER: return LedgerWallet.typeToInterface(blockchain);
        case EXT_WALLET_TYPES.APOCKET_RSN: return APocketRSN.typeToInterface();
    }
}

export class ExternalWalletInterface {

    constructor(handler){
        this.handler = handler;
    }

    async sign(publicKey, trx, abi){
        return await this.handler.sign(publicKey, trx, abi);
    }

    async getPublicKey(){
        return await this.handler.getPublicKey();
    }

    canConnect(){
        return this.handler.canConnect();
    }

}
