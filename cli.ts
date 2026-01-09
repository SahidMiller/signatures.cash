import { Command, Option } from 'commander';
import { createSecp256k1Template } from './secp256k1/index.ts';

const program = new Command();

program
  .name('cashscript-workflow')
  .description('Multi-step token workflow with CashScript')
  .version('1.0.0');

program
  .command('generate')
  .addOption(new Option('-c, --curve <curve>', 'Elliptic curve to use (secp256k1 or secp256r1)').choices(['k1', 'secp256k1', 'r1', 'p256', 'secp256r1']).default('k1'))
  .option('-p, --privateKey <number>', 'Private key as bigint', '98733646725470655376752971824954889924198128500106970646417174590256957899160')
  .option('-m, --msgHash <hash>', 'Message hash to sign')
  .description('Sign a message with a private key from the ring')
  .action(async (option) => {

    if (!option.msgHash) {
        console.error('Invalid message hash. Provide a valid hex string with --msgHash');
        return;
    }
    
    if (["k1", "secp256k1"].indexOf(option.curve) !== -1) {
      await createSecp256k1Template(option.privateKey, option.msgHash);
    } else {
      console.error('Unsupported curve. Use secp256k1 or secp256r1.');
    }
  });

program.parse();