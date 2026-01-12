import {
  OpcodesBch as Op,
  encodeDataPush,
  hexToBin,
  disassembleBytecodeBch,
  flattenBinArray,
  encodeAuthenticationInstructions,
  decodeAuthenticationInstructions,
} from '@bitauth/libauth';

export function asmToBytecode(asm: string): Uint8Array {
  // Remove any duplicate whitespace
  asm = asm.replace(/\s+/g, ' ').trim();

  // Convert the ASM tokens to AuthenticationInstructions
  const instructions = asm.split(' ').map((token) => {
    if (token.startsWith('OP_')) {
      return { opcode: Op[token] };
    }

    const data = token.replace(/<|>/g, '').replace(/^0x/, '');

    return decodeAuthenticationInstructions(encodeDataPush(hexToBin(data)))[0];
  });

  // Convert the AuthenticationInstructions to bytecode
  return encodeAuthenticationInstructions(instructions);
}

export const SigningSerializationFlag = {
    /**
     * A.K.A. `SIGHASH_ALL`
     */
    allOutputs: 1,
    /**
     * A.K.A `SIGHASH_NONE`
     */
    noOutputs: 2,
    /**
     * A.K.A. `SIGHASH_SINGLE`
     */
    correspondingOutput: 3,
    /**
     * A.K.A. `SIGHASH_UTXOS`
     */
    utxos: 32,
    forkId: 64,
    /**
     * A.K.A `ANYONE_CAN_PAY`/`SIGHASH_ANYONECANPAY`
     */
    singleInput: 128
}