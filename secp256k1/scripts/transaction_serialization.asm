< 
    // Convert int to compact size
    OP_DUP <253> OP_LESSTHAN
    OP_IF
        <2> OP_NUM2BIN <1> OP_SPLIT OP_DROP
    OP_ELSE
        OP_DUP <1> <16> OP_LSHIFTNUM OP_LESSTHAN
        OP_IF
            <3> OP_NUM2BIN <2> OP_SPLIT OP_DROP
            <0xfd> OP_SWAP OP_CAT
        OP_ELSE
            OP_DUP <1> <32> OP_LSHIFTNUM OP_LESSTHAN
            OP_IF
                <0x05> OP_INVOKE
                <0xfe> OP_SWAP OP_CAT
            OP_ELSE
                <9> OP_NUM2BIN <8> OP_SPLIT OP_DROP
                <0xff> OP_SWAP OP_CAT
            OP_ENDIF
        OP_ENDIF
    OP_ENDIF
> <0x04> OP_DEFINE

<<5> OP_NUM2BIN <4> OP_SPLIT OP_DROP> <0x05> OP_DEFINE

<
    /**
     * EncodeTokenPrefix(type: OutputType, i: int)
     * 
     * type {OutputTypeEnum} = {
     *  Output: 0,
     *  SourceOutput: 1,
     * }
     * 
     **/
    <>
    OP_OVER OP_3 OP_PICK OP_IF OP_UTXOTOKENCATEGORY OP_ELSE OP_OUTPUTTOKENCATEGORY OP_ENDIF 
    OP_IF
        <0xef> OP_CAT //Token prefix  
        OP_OVER OP_3 OP_PICK OP_IF OP_UTXOTOKENCATEGORY OP_ELSE OP_OUTPUTTOKENCATEGORY OP_ENDIF  <32> OP_SPLIT OP_DROP //prefix+category
        OP_CAT
        /* tokenBitfield */
            OP_OVER OP_3 OP_PICK OP_IF OP_UTXOTOKENAMOUNT OP_ELSE OP_OUTPUTTOKENAMOUNT OP_ENDIF OP_0 OP_EQUAL OP_IF <0x20> OP_ELSE <0x00> OP_ENDIF //HAS_NFT
            OP_2 OP_PICK OP_4 OP_PICK OP_IF OP_UTXOTOKENCOMMITMENT OP_ELSE OP_OUTPUTTOKENCOMMITMENT OP_ENDIF  OP_IF <0x40> OP_ELSE <0x00> OP_ENDIF //HAS_COMMITMENT_LENGTH
            OP_OR
            OP_2 OP_PICK OP_4 OP_PICK OP_IF OP_UTXOTOKENAMOUNT OP_ELSE OP_OUTPUTTOKENAMOUNT OP_ENDIF OP_0 OP_GREATERTHAN OP_IF <0x10> OP_ELSE <0x00> OP_ENDIF //HAS_AMOUNT
            OP_OR
            OP_2 OP_PICK OP_4 OP_PICK OP_IF OP_UTXOTOKENCATEGORY OP_ELSE OP_OUTPUTTOKENCATEGORY OP_ENDIF  <32> OP_SPLIT OP_NIP <1> OP_NUM2BIN //capabilityInt
            OP_OR
        /* end tokenBitfield */    
        OP_CAT
        OP_OVER OP_3 OP_PICK OP_IF OP_UTXOTOKENCOMMITMENT OP_ELSE OP_OUTPUTTOKENCOMMITMENT OP_ENDIF  OP_DUP OP_IF OP_SIZE <0x04> OP_INVOKE OP_SWAP OP_CAT OP_ELSE OP_DROP <> OP_ENDIF //varint(commitment.length) || commitment
        OP_CAT
        OP_OVER OP_3 OP_PICK OP_IF OP_UTXOTOKENAMOUNT OP_ELSE OP_OUTPUTTOKENAMOUNT OP_ENDIF  OP_DUP OP_IF <0x04> OP_INVOKE OP_ELSE OP_DROP <> OP_ENDIF //compact_uint(token amount)
        OP_CAT
    OP_ELSE
    OP_ENDIF
    OP_NIP
    OP_NIP
> <0x06> OP_DEFINE

<
    /**
     * SerializeOutput(type: OutputType, i: int)
     * 
     * type {OutputTypeEnum} = {
     *  Output: 0,
     *  SourceOutput: 1,
     * }
     * 
     **/
    OP_DUP OP_2 OP_PICK OP_IF OP_UTXOVALUE OP_ELSE OP_OUTPUTVALUE OP_ENDIF <9> OP_NUM2BIN <8> OP_SPLIT OP_DROP //uint64(value)
    /* lockingBytecodeField */
        OP_ROT OP_ROT OP_2DUP //uint64(value), type, i, type, i
        <0x06> OP_INVOKE //uint64(value), type, i, token prefix
        OP_OVER OP_3 OP_PICK OP_IF OP_UTXOBYTECODE OP_ELSE OP_OUTPUTBYTECODE OP_ENDIF //bytecode
        OP_CAT 
    /* end lockingBytecodeField */
    OP_SIZE <0x04> OP_INVOKE OP_SWAP OP_CAT //compact_uint(lockingBytecodeField.length) || lockingBytecodeField
    OP_3 OP_ROLL OP_SWAP OP_CAT //uint64(value) || compact_uint(lockingBytecodeField.length) || lockingBytecodeField
> <0x07> OP_DEFINE

<0x00> OP_CAT
OP_DUP <0x1f00> OP_AND //hashType, hashType & SIGHASH_ANYONECANPAY
OP_OVER <0x4000> OP_AND OP_BIN2NUM OP_0NOTEQUAL OP_VERIFY
OP_OVER OP_DUP <0x8000> OP_AND OP_BIN2NUM OP_0NOTEQUAL //hashType & SIGHASH_ANYONECANPAY
OP_SWAP <0x2000> OP_AND OP_BIN2NUM OP_0NOTEQUAL //hashType & SIGHASH_UTXOS

OP_TXVERSION <0x05> OP_INVOKE // uint32(nVersion)

// hashPrevouts
    OP_2 OP_PICK //hashType & SIGHASH_ANYONECANPAY
    OP_IF
        <0> <32> OP_NUM2BIN //u32(0x00)
    OP_ELSE
        <0> <0> 
        OP_BEGIN 
            OP_DUP OP_OUTPOINTTXHASH OP_REVERSEBYTES <1> OP_SPLIT OP_NIP OP_REVERSEBYTES //outpoint.txid
            OP_OVER OP_OUTPOINTINDEX <0x05> OP_INVOKE //u32(outpoint.index)
            OP_CAT //outpoint.txid || u32(outpoint.index)
            OP_ROT OP_SWAP //i, acc, outpoint.txid || u32(outpoint.index)
            OP_CAT //i, acc || outpoint.txid || u32(outpoint.index)
            OP_SWAP //acc, i
            OP_1ADD OP_DUP OP_TXINPUTCOUNT OP_EQUAL 
        OP_UNTIL 
        OP_DROP
        OP_HASH256
    OP_ENDIF
    OP_CAT // append hashPrevouts

// hashUtxos
    OP_OVER //hashType & SIGHASH_UTXOS
    OP_IF
        <0> //acc
        <0> //i
        OP_BEGIN 
            <1> OP_SWAP <0x07> OP_INVOKE OP_ROT OP_DROP //serializedOutput
            OP_ROT OP_SWAP //i, acc, serializedOutput
            OP_CAT //i, acc || serializedOutput
            OP_SWAP //acc, i
            OP_1ADD OP_DUP OP_TXINPUTCOUNT OP_EQUAL 
        OP_UNTIL 
        OP_DROP
        OP_HASH256
    OP_ELSE
        <>
    OP_ENDIF
    OP_CAT

// hashSequence
    OP_2 OP_PICK //hashType & SIGHASH_ANYONECANPAY
    OP_4 OP_PICK <0x0200> OP_EQUAL OP_BOOLOR //OR baseType == SIGHASH_NONE
    OP_4 OP_PICK <0x0300> OP_EQUAL OP_BOOLOR  //OR baseType == SIGHASH_SINGLE
    OP_IF
        <0> <32> OP_NUM2BIN //u32(0x00)
    OP_ELSE
        <0> <0> //acc, i
        OP_BEGIN 
            OP_DUP OP_INPUTSEQUENCENUMBER //input.sequence
            OP_ROT OP_SWAP //i, acc, input.sequence
            OP_CAT //i, acc || input.sequence
            OP_SWAP //acc, i
            OP_1ADD OP_DUP OP_TXINPUTCOUNT OP_EQUAL 
        OP_UNTIL 
        OP_DROP
        OP_HASH256 
    OP_ENDIF
    OP_CAT // append hashSequence

//current outpoint
    OP_INPUTINDEX OP_OUTPOINTTXHASH OP_REVERSEBYTES <1> OP_SPLIT OP_NIP OP_REVERSEBYTES //input.txid
    OP_INPUTINDEX OP_OUTPOINTINDEX <0x05> OP_INVOKE //uint4(input.vout)
    OP_CAT
    <0> OP_INPUTINDEX <0x06> OP_INVOKE //token prefix
    OP_CAT
    OP_ACTIVEBYTECODE OP_SIZE <0x04> OP_INVOKE OP_SWAP OP_CAT //varint(input.bytecode.length) || input.bytecode)
    OP_CAT
    OP_INPUTINDEX OP_UTXOVALUE <8> OP_NUM2BIN //uint4(input.value)
    OP_CAT
    OP_INPUTINDEX OP_INPUTSEQUENCENUMBER //uint4(input.seq)
    OP_CAT
OP_CAT // append serialize(current outpoint)

// hashOutputs
    OP_3 OP_PICK <0x0100> OP_EQUAL
    OP_IF
        <0> //acc
        <0> //i
        OP_BEGIN 
            <0> OP_SWAP <0x07> OP_INVOKE OP_ROT OP_DROP
            OP_ROT OP_SWAP //i, acc, uint64(value) || compact_uint(lockingBytecodeField.length) || lockingBytecodeField
            OP_CAT //i, acc || uint64(value) || compact_uint(lockingBytecodeField.length) || lockingBytecodeField
            OP_SWAP //acc, i
            OP_1ADD OP_DUP OP_TXOUTPUTCOUNT OP_EQUAL 
        OP_UNTIL 
        OP_DROP
        OP_HASH256
    OP_ELSE
        OP_3 OP_PICK <0x0200> OP_EQUAL
        OP_IF
            <0> <32> OP_NUM2BIN
        OP_ELSE
            OP_3 OP_PICK <0x0300> OP_EQUAL
            OP_IF
                OP_INPUTINDEX OP_TXOUTPUTCOUNT OP_LESSTHAN
                OP_IF
                    OP_INPUTINDEX OP_OUTPUTVALUE <8> OP_NUM2BIN  //uint64(value)
                    
                    /* lockingBytecodeField */
                        <>
                        OP_INPUTINDEX OP_OUTPUTTOKENCATEGORY
                        OP_IF
                            <0xef> OP_CAT //Token prefix
                            
                            OP_INPUTINDEX OP_OUTPUTTOKENCATEGORY <32> OP_SPLIT OP_DROP  //prefix+category
                            OP_CAT
                            /* tokenBitfield */
                                OP_INPUTINDEX OP_OUTPUTTOKENAMOUNT OP_0 OP_EQUAL OP_IF <0x20> OP_ELSE <0x00> OP_ENDIF //HAS_NFT
                                OP_INPUTINDEX OP_OUTPUTTOKENCOMMITMENT OP_IF <0x40> OP_ELSE <0x00> OP_ENDIF //HAS_COMMITMENT_LENGTH
                                OP_OR
                                OP_INPUTINDEX OP_OUTPUTTOKENAMOUNT OP_0 OP_GREATERTHAN OP_IF <0x10> OP_ELSE <0x00> OP_ENDIF //HAS_AMOUNT
                                OP_OR
                                OP_INPUTINDEX OP_OUTPUTTOKENCATEGORY <32> OP_SPLIT OP_NIP <1> OP_NUM2BIN //capabilityInt
                                OP_OR
                            /* end tokenBitfield */    
                            OP_CAT
                            OP_INPUTINDEX OP_OUTPUTTOKENCOMMITMENT OP_DUP OP_IF OP_SIZE <0x04> OP_INVOKE OP_SWAP OP_CAT OP_ELSE OP_DROP <> OP_ENDIF //varint(commitment.length) || commitment
                            OP_CAT
                            OP_INPUTINDEX OP_OUTPUTTOKENAMOUNT OP_DUP OP_IF <0x04> OP_INVOKE OP_ELSE OP_DROP <> OP_ENDIF //compact_uint(token amount)
                            OP_CAT
                        OP_ELSE
                        OP_ENDIF
                        OP_INPUTINDEX OP_OUTPUTBYTECODE //bytecode
                        OP_CAT 
                    /* end lockingBytecodeField */

                    OP_SIZE <0x04> OP_INVOKE OP_SWAP OP_CAT //compact_uint(lockingBytecodeField.length) || lockingBytecodeField
                    OP_CAT //uint64(value) || compact_uint(lockingBytecodeField.length) || lockingBytecodeField        
                    OP_HASH256
                OP_ELSE
                    <0> <32> OP_NUM2BIN
                OP_ENDIF
            OP_ELSE
                OP_0 OP_VERIFY
            OP_ENDIF
        OP_ENDIF
    OP_ENDIF
    OP_CAT // append hashOutputs

OP_TXLOCKTIME <0x05> OP_INVOKE // uint4(nLocktime)
OP_CAT

OP_NIP OP_NIP OP_NIP
OP_SWAP <0x05> OP_INVOKE //uint4(sighash)
OP_CAT

OP_HASH256