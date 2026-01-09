/* Padding */ OP_DROP
/* P2SH */ OP_DUP OP_SHA256 <0xea7112e972cb65ff420db31a83aea19a58fa7aa87e8153a294df5a1785e37ad6> OP_EQUALVERIFY <0x01> OP_DEFINE 
/* Param */ <$(compressed_key)> //Compressed Key

OP_SWAP OP_DUP OP_TOALTSTACK OP_SIZE OP_1SUB OP_SPLIT OP_SWAP <32> OP_SPLIT OP_DROP //(Sig) -> r, s
OP_SWAP transaction_serialization
OP_SWAP OP_ROT OP_CAT //msg, r || key 
OP_SWAP OP_CAT //r || key || msg
OP_SHA256 //e = H(r || key || msg)
OP_REVERSEBYTES OP_SIZE OP_1SUB OP_SPLIT OP_DUP <0x00> OP_CAT OP_BIN2NUM <0x8000> OP_GREATERTHAN OP_IF <0x00> OP_CAT OP_ENDIF OP_CAT //e to bigint 
OP_ROT OP_ROT //e, k2, k1

/* Param */ <$(table_p_hash)> //Table Hash

/* Invocation */
<0x01> OP_INVOKE OP_SWAP OP_NEGATE OP_DUP OP_0 OP_EQUAL OP_NOTIF OP_DUP OP_0 OP_LESSTHAN OP_IF <115792089237316195423570985008687907853269984665640564039457584007908834671663> OP_SWAP OP_ADD OP_ENDIF OP_ENDIF OP_SWAP //Negate Y

/* Covenant */
OP_DEPTH OP_2 OP_EQUALVERIFY //Verify result Y,X
OP_SWAP <33> OP_NUM2BIN OP_SWAP <33> OP_NUM2BIN OP_CAT  OP_SIZE <0x04> OP_INVOKE OP_SWAP OP_CAT //push ep_result
OP_FROMALTSTACK OP_SIZE <0x04> OP_INVOKE OP_SWAP OP_CAT //push signature
OP_CAT //expected head of second unlocking script
OP_SIZE <1> OP_INPUTBYTECODE OP_SWAP OP_SPLIT OP_DROP //actual head of second unlocking script
OP_EQUALVERIFY //verify second script verifies rest of computation
<1> OP_UTXOBYTECODE <affine_verify_chain_final> OP_EQUALVERIFY //Verify second script is locked appropriately

OP_1