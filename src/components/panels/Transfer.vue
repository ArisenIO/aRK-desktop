<template>
    <section>

        <section>

            <section class="selected-item scrollable" style="height:100vh">

                <figure class="name" style="padding-bottom:10px; border-bottom:1px solid rgba(0,0,0,0.1); margin-bottom:20px;">
                    Transfer Private Currency
                </figure>

                <section>
                    <sel :selected="account"
                         :options="rsnAccounts"
                         :parser="x => `${x.network().name} - ${x.formatted()}`"
                         v-on:changed="selectAccount"></sel>
                </section>

                <section v-if="account && token">

                    <section class="split-panels left">
                        <section class="info-box">

                            <swch first="Currency Selector" second="Custom Currency" :selected="customToken ? 'Currency Selector' : 'Custom Currency'" v-on:switched="toggleCustomToken"></swch>

                            <section v-if="!customToken">
                                <br>
                                <sel :selected="token"
                                     :options="tokens"
                                     :parser="t => t.name"
                                     :img-parser="t => t.logo"
                                     v-on:changed="selectToken"></sel>
                            </section>

                            <section v-else>
                                <cin placeholder="Custom Currency Symbol" :text="token.symbol" v-on:changed="changed => bind(changed, 'token.symbol')"></cin>
                                <cin placeholder="Custom Currency Account" :text="token.account" v-on:changed="changed => bind(changed, 'token.account')"></cin>
                            </section>

                            <br>
                            <cin disabled="true" forced="true" placeholder="Transferable Currencies" :text="`${tokenBalance} ${token.symbol}`"></cin>

                        </section>
                    </section>

                    <section class="split-panels">
                        <section class="info-box top">

                            <section v-if="tokenBalance > 0">
                                <section style="overflow:hidden;">
                                    <cin class="half-input" placeholder="Recipient Bank Account" :text="to" v-on:changed="changed => bind(changed, 'to')"></cin>
                                    <cin class="half-input" placeholder="Quantity" type="number" :text="amount" v-on:changed="changed => bind(changed, 'amount')"></cin>
                                </section>
                                <cin placeholder="Payment Memo" :text="memo" v-on:changed="changed => bind(changed, 'memo')"></cin>
                                <br>
                                <btn :disabled="sending" style="float:right;" text="Send Currency" :red="true" large="true" v-on:clicked="send"></btn>
                            </section>

                        </section>
                    </section>
                </section>




            </section>
        </section>

    </section>
</template>

<script>
    import { mapActions, mapGetters, mapState } from 'vuex'
    import * as Actions from '../../store/constants';

    import Network from '../../models/Network'

    import {Popup} from '../../models/popups/Popup'
    import PopupService from '../../services/PopupService';

    import PluginRepository from '../../plugins/PluginRepository';
    import {Blockchains} from '../../models/Blockchains';

    let saveTimeout = null;

    export default {
        data () {return {
            account:null,

            to:'',
            amount:0,
            memo:'',

            sending:false,

            token:null,
            tokens:[],
            tokenBalance:0,

            customToken:false,
        }},
        computed:{
            ...mapState([
                'arkid'
            ]),
            ...mapGetters([
                'networks',
                'accounts',
            ]),
            network(){
                return this.networks.find(x => x.unique() === this.account.networkUnique);
            },
            rsnAccounts(){
                return this.accounts.filter(x => x.blockchain() === Blockchains.ARISEN);
            }
        },
        mounted(){
            this.account = this.rsnAccounts[0];
            this.initTokens();
        },
        methods: {
            selectAccount(account){
                this.account = account;
                this.initTokens();
            },
            toggleCustomToken(){
                this.customToken = !this.customToken;
            },
            async initTokens(){
                this.token = null;
                await PluginRepository.plugin(this.account.blockchain()).fetchTokens(this.tokens);
                switch(this.account.blockchain()){
                    case Blockchains.ARISEN: this.token = this.tokens.find(x => x.symbol === 'RSN'); break;
                    case Blockchains.ETH: this.token = this.tokens.find(x => x.symbol === 'ETH'); break;
                }
                if(!this.token) this.token = this.tokens[0];
                this.setTokenBalance();
            },

            selectToken(token){
                this.token = token;
                this.setTokenBalance();
            },

            async setTokenBalance(){
                this.tokenBalance = await PluginRepository.plugin(this.account.blockchain()).balanceFor(this.account, this.network, this.token.account, this.token.symbol);
            },

            async send(){
                if(parseFloat(this.amount) <= 0) return PopupService.push(Popup.prompt("Invalid Amount", "You must send an amount greater than 0", "ban", "Okay"));
                if(!this.to.trim().length) return PopupService.push(Popup.prompt("Invalid Recipient", "You must enter a valid recipient", "ban", "Okay"));

                this.sending = true;
                if(this.account.blockchain() === Blockchains.ARISEN) this.sendRsnTokens();
            },

            async sendRsnTokens(){
                const decimals = this.tokenBalance.toString().split('.')[1].length || 4;
                const amount = parseFloat(this.amount).toFixed(decimals);
                this.amount = amount;


                const transfer = await PluginRepository.plugin(this.account.blockchain())
                    .transfer(
                        this.account,
                        this.to,
                        `${amount} ${this.token.symbol}`,
                        this.network,
                        this.token.account,
                        this.token.symbol,
                        this.memo
                    ).catch(x => x);

                if(transfer !== null) {
                    if (transfer.hasOwnProperty('error')) PopupService.push(Popup.prompt("Transfer Error", transfer.error, "ban", "Okay"));
                    else PopupService.push(Popup.transactionSuccess(Blockchains.ARISEN, transfer.transaction_id))
                }

                this.sending = false;
                await this.setTokenBalance();
            },

            ...mapActions([
                Actions.SET_ARKID
            ])
        },
        watch:{
            token:{
                handler(){
                    if(!this.customToken) return;
                    this.setTokenBalance();
                }, deep:true
            }
        },
    }
</script>

<style scoped lang="scss" rel="stylesheet/scss">
    @import "../../_variables";

    .half-input {
        width:calc(50% - 10px);
        float:left;

        &:nth-child(2){
            width:50%;
            margin-left:10px;
            border-left:1px solid rgba(0,0,0,0.08);
            padding-left:10px;
        }
    }

</style>
