<template>
    <section>

        <section class="panel display">
            <section class="head">

            </section>

            <section class="selected-item scrollable" v-if="Object.keys(allExplorers).length">
                <figure class="name">Select a bank explorer</figure>
                <figure class="description">Bank explorers allow you to view transactions, accounts, and other details within a decentralized bank's network. Transparency is awesome isn't it?</figure>

                <figure class="line"></figure>

                <section class="info-box" v-for="blockchain in blockchainsArray">
                    <figure class="name">{{blockchainName(blockchain.value)}}</figure>
                    <sel :options="allExplorers[blockchain.value]"
                         :selected="explorers[blockchain.value]"
                         :parser="x => x.name"
                         v-on:changed="x => changedExplorer(blockchain.value, x)"></sel>
                </section>

            </section>
        </section>

    </section>
</template>

<script>
    import { mapActions, mapGetters, mapState } from 'vuex'
    import * as Actions from '../../store/constants';
    import {Blockchains, BlockchainsArray, blockchainName} from '../../models/Blockchains';
    import PluginRepository from '../../plugins/PluginRepository'



    export default {
        data () {return {
            blockchains:Blockchains,
            blockchainsArray:BlockchainsArray,
            allExplorers:{}
        }},
        computed:{
            ...mapState([
                'arkid'
            ]),
            ...mapGetters([
                'explorers',
            ])
        },
        mounted(){
            this.allExplorers = PluginRepository.allExplorers();
        },
        methods: {
            changedExplorer(blockchain, explorer){
                const arkid = this.arkid.clone();
                arkid.settings.explorers[blockchain] = explorer;
                this[Actions.SET_ARKID](arkid);
            },
            blockchainName(x){ return blockchainName(x); },
            ...mapActions([
                Actions.SET_ARKID
            ])
        },
    }
</script>

<style scoped lang="scss" rel="stylesheet/scss">
    @import "../../_variables";

    .line {
        width:100%;
        height:1px;
        background:rgba(0,0,0,0.1);
        margin-top:30px;
    }
</style>
