<template>
    <section class="onboarding">

        <section>

            <img src="../assets/icon.png"/>

            <section class="onboarder" v-if="step === steps.IDENTITY">
                <h1>Create your decentralized banking identity.</h1>
                <p>
                    The name you choose will be your identity for all Arisen-based decentralized banking and financial applications. It will function as
                    your “username” on all banking and financial applications associated with the people-ran Arisen decentralized banking network. This allows
                    people to see who you are.
                </p>

                <section class="input-container">
                    <section class="input">
                        <cin v-on:enter="setIdentityName" large-font="1" :text="identityName" key="name"
                             placeholder="Enter a Name" v-on:changed="changed => bind(changed, 'identityName')"></cin>
                    </section>
                    <section class="button">
                        <btn text="Continue" secondary="1" v-on:clicked="setIdentityName"></btn>
                    </section>
                </section>
                <i class="name-terms">Between 3-20 character, No spaces and only characters a-z, A-Z, 0-9, - or _</i>
            </section>







            <section class="onboarder" v-if="step === steps.BACKUP">
                <h1>Set your Banking Key Backup Location</h1>
                <p>
                    <b class="red">ArisenID creates what are called keys, which allow you access to a particular identity and associated banking account on an Arisen-based nework.
                    ArisenID doesn't create keypairs using what we call a mnemonic</b>. A mnemonic is basically a 12 word, human readable phrase. In other words, you should make
                    a habit of keeping an encrypted backup of your ArisenID just in case you lose access, but we we'll never force you to do anything.
                    <br><br>
                    <b>You can also have ArisenID create automatic backups for your banking identities, to your exact preference:</b>
                </p>

                <section v-if="!hasBackupLocation">
                    <swch first="Automatic Backups" second="Manual Backups Only"
                          :selected="autoBackup !== strategies.AUTOMATIC ? 'Automatic Backups' : 'Manual Backups Only'"
                          v-on:switched="setBackupStrategy(autoBackup === strategies.AUTOMATIC ? strategies.MANUAL : strategies.AUTOMATIC)"></swch>
                </section>

                <btn v-if="autoBackup === strategies.MANUAL" large="1" text="Continue Without Automatic Backups" red="1" v-on:clicked="nextStep"></btn>

                <section v-if="autoBackup === strategies.AUTOMATIC">
                    <btn v-if="hasBackupLocation" text="Continue" large="true" v-on:clicked="nextStep()"></btn>
                    <btn v-if="!hasBackupLocation" text="Choose Automatic Backup Location" secondary="true" large="true" v-on:clicked="setBackupLocation()"></btn>
                </section>
            </section>







            <section class="onboarder" v-if="step === steps.BLOCKCHAIN">
                <h1>Need a Blockchain Account?</h1>
                <p>
                    Blockchain Accounts let you interact with the blockchain. If you know that you need one,
                    enter your Private Key below and ArisenID will set up everything for you.
                </p>

                <section class="input-container">
                    <section class="input">
                        <cin @changed="makePublicKey" placeholder="Enter a Private Key" key="blockchain" v-on:enter="importBlockchainAccount"
                             type="password" :text="keypair.privateKey" v-on:changed="changed => bind(changed, 'keypair.privateKey')"></cin>
                    </section>
                    <section class="button">
                        <btn text="Import Account" secondary="1" v-on:clicked="importBlockchainAccount"></btn>
                        <btn text="Skip" red="1" v-on:clicked="skipBlockchain"></btn>
                    </section>
                </section>
                <i class="name-terms">{{keypair.publicKey.length ? keypair.publicKey : 'Once you enter a valid private key you will see the public key here.'}}</i>
            </section>

        </section>


    </section>
</template>

<script>
    import { mapActions, mapGetters, mapState } from 'vuex'
    import * as Actions from '../store/constants';
    import {RouteNames} from '../vue/Routing';

    import Identity from '../models/Identity';
    import Keypair from '../models/Keypair';
    import {Popup} from '../models/popups/Popup'
    import PopupService from '../services/PopupService';
    import KeyPairService from '../services/KeyPairService';
    import BackupService from '../services/BackupService';
    import AccountService from '../services/AccountService';
    import PluginRepository from '../plugins/PluginRepository';
    import {BACKUP_STRATEGIES} from '../models/Settings';

    const STEPS = {
        IDENTITY:'identity',
        BACKUP:'backup',
        BLOCKCHAIN:'blockchain'
    };

    export default {
        data () {return {
            strategies:BACKUP_STRATEGIES,
            identityName:'',
            steps:STEPS,
            step:STEPS.IDENTITY,
            keypair:Keypair.placeholder(),
            keypairSaved:false,
            importingAccount:false,
        }},
        computed: {
            ...mapState([
                'arkid'
            ]),
            ...mapGetters([
                'linkedApps',
                'autoBackup',
                'backupLocation'
            ]),
            hasBackupLocation(){
                return this.backupLocation && this.backupLocation.length
            }
        },
        mounted(){

        },
        methods: {
            nextStep(){
                this.step = STEPS[Object.keys(STEPS)[Object.keys(STEPS).indexOf(this.step.toUpperCase())+1]];
                if(!this.step) this.finish();
            },
            async setBackupStrategy(strategy){
                await BackupService.setBackupStrategy(strategy);
            },
            async setBackupLocation(){
                await BackupService.setBackupLocation();
            },
            setIdentityName(){
                if(!Identity.nameIsValid(this.identityName)) return PopupService.push(Popup.invalidIdentityName());

                const arkid = this.arkid.clone();
                const identity = arkid.keychain.identities[0];
                identity.name = this.identityName;
                arkid.keychain.updateOrPushIdentity(identity);
                this[Actions.SET_ARKID](arkid);
                this.nextStep();
            },
            async makePublicKey(){
                setTimeout(async () => {
                    if(!KeyPairService.isValidPrivateKey(this.keypair))
                        this.keypair.publicKey = '';
                    if(this.keypair.privateKey.length < 50) return false;

                    // Conforming private key to standard input
                    this.keypair.privateKey = PluginRepository.plugin(this.keypair.blockchain).conformPrivateKey(this.keypair.privateKey);

                    await KeyPairService.makePublicKey(this.keypair);
                }, 100)
            },
            async importBlockchainAccount(){
                if(!this.keypair.publicKey.length) return PopupService.push(Popup.snackbar("Invalid Private Key", "ban"));
                this.importingAccount = true;

                const network = await PluginRepository.plugin(this.keypair.blockchain).getEndorsedNetwork();

                const importAccount = async () => {
                    if(AccountService.accountsAreImported(this.keypair)){
                        const availableAccounts = await AccountService.getImportableAccounts(this.keypair, network);
                        if(!availableAccounts || !availableAccounts.length){
                            PopupService.push(Popup.prompt(`Can't find ${this.keypair.blockchain.toUpperCase()} accounts`,
                                `Are you sure you have an account on the ${this.keypair.blockchain.toUpperCase()} blockchain?`,
                                "ban", "Go Back"));
                            this.importingAccount = false;
                            return false;
                        }
                        const account = availableAccounts[0];
                        await AccountService.addAccount(account);
                        this.nextStep();
                    } else {
                        await AccountService.addAccountFromKeypair(this.keypair, network);
                        this.nextStep();
                    }
                };

                if(!this.keypairSaved) {
                    this.keypair.name = 'Imported From Setup Wizard';
                    KeyPairService.saveKeyPair(this.keypair, async () => {
                        this.keypairSaved = true;
                        await importAccount();
                    });
                }
                else await importAccount();
            },
            skipBlockchain(){
                this.finish();
            },
            finish(){
                this.$router.push({name:RouteNames.IDENTITIES});
            },
            ...mapActions([
                Actions.SET_ARKID
            ])
        }
    }
</script>

<style scoped lang="scss" rel="stylesheet/scss">
    @import "../_variables.scss";

    .red {
        color:$red;
    }

    .onboarding {
        height:100vh;
        width:100%;
        -webkit-app-region: drag;

        display: flex;
        justify-content: center;
        align-items: center;
        text-align: center;

        .logo {
            font-family: 'Grand Hotel', sans-serif;
            font-size: 72px;
            color: #f6f6f6;
            margin-bottom:20px;
        }

        .onboarder {
            -webkit-app-region: no-drag;
            max-width:510px;
            margin:0 auto;

            h1 {
                font-size: 24px;
                font-weight: 400;
                margin:0;
            }

            p {
                font-size: 16px;
                color:#838383;
            }

            .input-container {
                display:flex;
                flex-direction: row;

                .input {
                    flex:1;
                    margin-right:20px;
                    text-align:left;


                }

                .button {
                    float:left;
                }
            }

            .name-terms {
                font-size: 13px;
                line-height:18px;
                padding:10px 0;
                display: block;
            }
        }

    }
</style>
