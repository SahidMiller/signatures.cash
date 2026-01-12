import { Command, Option } from 'commander';
import { createSecp256k1Template } from './secp256k1/index.ts';
import { createSecp256r1Template } from './secp256r1/index.ts';
import { generateSigningSerializationBch, generateSigningSerializationComponentsBch, hash256, importWalletTemplate, walletTemplateToCompilerBch } from '@bitauth/libauth';
import chalk from 'chalk';
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
    
    const msgHash = option.msgHash.replace(/^0x/, '');
    if (["k1", "secp256k1"].indexOf(option.curve) !== -1) {
      await createSecp256k1Template(option.privateKey, msgHash);
    } else if (['r1', 'p256', 'secp256r1'].indexOf(option.curve) !== -1) {
      await createSecp256r1Template(option.privateKey, msgHash);
    } else {
      console.error('Unsupported curve. Use secp256k1 or secp256r1.');
    }
  });

program
  .command('sighash')
  .option('-f, --file <path>', 'Path to the transaction file', './secp256r1/transaction/template.json')
  .option('--scenario <name>', 'Scenario name in the transaction file', 'transaction_serialization')
  .option('-i, --inputIndex <number>', 'Input index to compute the sighash for', '0')
  .option('-s, --sighashFlag <type>', 'Sighash flag as hex string', '01')
  .option('-v, --verbose', 'Enable verbose output', false)
  .description('Compute the sighash for a given transaction scenario')
  .action(async (option) => {
    if (!option.file) {
      console.error('Transaction file path is required.');
      return;
    }

    const inputIndex = parseInt(option.inputIndex);
    if (option.inputIndex === undefined || isNaN(inputIndex) || inputIndex < 0) {
      console.error('Valid input index is required.');
      return;
    }

    try {

      const { default: transaction } = await import(option.file, { with: { type: "json" } });
      const scenario = transaction.scenarios[option.scenario];
      if (!scenario) {
        console.error(`Scenario "${option.scenario}" not found in transaction file.`);
        return;
      }
      
      const sighashType = Buffer.from(option.sighashFlag.replace(/^0x/, ''), 'hex');
      
      if (sighashType.length !== 1) {
        console.error('Sighash flag must be a single byte hex string.');
        return;
      }

      
      console.log(`Computing sighash for scenario "${option.scenario}"...`);
      const template = importWalletTemplate(transaction);
      if (typeof template === "string") throw new Error(template); // import error string
      const compiler = walletTemplateToCompilerBch(template);

      const result = compiler.generateScenario({ debug: true, lockingScriptId: "transaction_serialization", scenarioId: "transaction_serialization" });
      if (typeof result == 'string' || typeof result.scenario == 'string' || !result.lockingCompilation.success) {
        console.log("Error:", typeof result === 'string' ? result : result.lockingCompilation);
        return;
      }

      const coveredBytecode = Buffer.from(result.lockingCompilation.bytecode);   
      const sighashPreimageComponents = generateSigningSerializationComponentsBch(result.scenario.program);   
      const sighashPreimage = generateSigningSerializationBch(result.scenario.program, {
        signingSerializationType: sighashType,
        coveredBytecode
      });

      if (option.verbose) {
        
        console.log(chalk.green("Signing Serialization Components:"));
        console.log({
          ...Object.keys(sighashPreimageComponents).reduce((acc, key) => {
            if (sighashPreimageComponents[key] instanceof Uint8Array) {
              acc[key] = Buffer.from(sighashPreimageComponents[key]).toString('hex');
            } else {
              acc[key] = sighashPreimageComponents[key];
            }
            return acc;
          }, {}),
          hashPrevouts: Buffer.from(hash256(sighashPreimageComponents.transactionOutpoints)).toString('hex'),
          hashUtxos: Buffer.from(hash256(sighashPreimageComponents.transactionUtxos)).toString('hex'),
          hashSequence: Buffer.from(hash256(sighashPreimageComponents.transactionSequenceNumbers)).toString('hex'),
          hashOutputs: Buffer.from(hash256(sighashPreimageComponents.transactionOutputs)).toString('hex'),
        });
        
        console.log(chalk.green(`Sighash preimage (${sighashType}) for input index ${inputIndex}:`));
        console.log(Buffer.from(sighashPreimage).toString('hex'));
      }

      console.log(chalk.green("Sighash:"));
      console.log(Buffer.from(hash256(sighashPreimage)).toString('hex'));

    } catch (error) {
      console.error('Error reading transaction file or scenario:', error);
      return;
    }
  });

program.parse();