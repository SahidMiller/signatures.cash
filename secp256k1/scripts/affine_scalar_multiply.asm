<
    //JacobianDouble(z,y,x)
    OP_2DUP //Y, X
    OP_0 OP_EQUAL //X == 0
    OP_SWAP OP_DUP //Y
    OP_0 OP_EQUAL //Y == 0
    OP_ROT //Y, X==0, Y==0
    OP_BOOLAND //Y, X==0 && Y==0
    OP_SWAP //X==0 && Y==0, Y
    OP_0 OP_EQUAL //X==0 && Y==0, Y == 0
    OP_BOOLOR //(X==0 && Y==0) || Y == 0
    OP_IF //X == 0 && Y == 0 (Infinity) || Y==0
        OP_2DROP //Y2, X2
        OP_DROP
        <0>
        <0>
    OP_ELSE
        OP_DUP //X
        OP_DUP OP_MUL //X, X^2
        OP_3 OP_MUL //num = 3X^2
            OP_DEPTH OP_1SUB OP_PICK OP_MOD

        OP_2 OP_PICK //Y
        OP_DUP OP_ADD //den = 2Y
        
        //(den * den inv) % p === 1
        OP_4 OP_ROLL //den inv
        OP_SWAP //den
        OP_OVER //den inv
        OP_MUL //(den * den inv)
            OP_DEPTH OP_1SUB OP_PICK OP_MOD
        OP_1 OP_EQUALVERIFY //(den * den inv) % p === 1

        OP_MUL //lamda = (num * den inv)
            OP_DEPTH OP_1SUB OP_PICK OP_MOD
        
        OP_DUP //lamda
        OP_DUP OP_MUL //lamda, lamda^2 (could mod now if we full mod later)
        OP_2 OP_PICK //X
        OP_DUP OP_ADD //2X
        OP_SUB //X3 = lamda^2 - 2X
            OP_DEPTH OP_1SUB OP_PICK OP_TUCK OP_MOD OP_DUP OP_0 OP_LESSTHAN OP_IF OP_ADD OP_ELSE OP_NIP OP_ENDIF

        OP_ROT //X
        OP_OVER //X, X3
        OP_SUB //X - X3
        OP_ROT //lamda
        OP_MUL //lamda * (X-X3)
        OP_ROT //Y
        OP_SUB //Y3 = lambda * (X-X3) - Y
            OP_DEPTH OP_1SUB OP_PICK OP_TUCK OP_MOD OP_DUP OP_0 OP_LESSTHAN OP_IF OP_ADD OP_ELSE OP_NIP OP_ENDIF

        OP_SWAP
    OP_ENDIF
> <0x02> OP_DEFINE
<
    OP_2DUP //Y1, X1
    OP_0 OP_EQUAL //X1 == 0
    OP_SWAP //Y1
    OP_0 OP_EQUAL //Y1 == 0
    OP_BOOLAND
    OP_IF //X1 == 0 && Y1 == 0 (Infinity)
        OP_2DROP //Y2, X2
        OP_ROT //dx inv
        OP_DROP
    OP_ELSE
        OP_2SWAP //Y2, X2
        OP_2DUP
        OP_0 OP_EQUAL //X2 == 0
        OP_SWAP //Y2
        OP_0 OP_EQUAL //Y2 == 0
        OP_BOOLAND
        OP_IF //X2 == 0 && Y2 == 0 (Infinity)
            OP_2DROP
            OP_ROT //dx inv
            OP_DROP
        OP_ELSE
            OP_2SWAP //Y2, X2, Y1, X1
            OP_DUP //X1
            OP_3 OP_PICK //X2
            OP_EQUAL //X1 == X2
            OP_IF
                OP_OVER //Y1
                OP_4 OP_PICK //Y2
                OP_EQUAL //Y1 == Y2
                OP_IF 
                    //Affine Double
                    OP_2DROP
                    
                OP_ELSE
                    //Inverses (Return Infinite)
                    OP_2DROP
                    OP_2DROP
                    OP_DROP
                    <0>
                    <0>
                OP_ENDIF
            OP_ELSE
                OP_OVER //Y1
                OP_4 OP_ROLL //Y2
                OP_SWAP //Y2, Y1
                OP_SUB //dy=Y2 - Y1
                    OP_DEPTH OP_1SUB OP_PICK OP_TUCK OP_MOD OP_DUP OP_0 OP_LESSTHAN OP_IF OP_ADD OP_ELSE OP_NIP OP_ENDIF
                
                OP_3 OP_PICK //X2
                OP_2 OP_PICK //X1
                OP_SUB //dx=X2 - X1
                    OP_DEPTH OP_1SUB OP_PICK OP_TUCK OP_MOD OP_DUP OP_0 OP_LESSTHAN OP_IF OP_ADD OP_ELSE OP_NIP OP_ENDIF
                
                //(a * inv) % p === 1
                OP_5 OP_ROLL //dx inv
                OP_SWAP //dx
                OP_OVER //dx inv
                OP_MUL //(dx * dx inv)
                    OP_DEPTH OP_1SUB OP_PICK OP_MOD
                OP_1 OP_EQUALVERIFY //(a * inv) % p === 1

                OP_MUL //lamda = (dx inv * dy) % p
                    OP_DEPTH OP_1SUB OP_PICK OP_MOD

                OP_DUP //lamda
                OP_DUP OP_MUL //lamda, lamda^2 (could mod now if we full mod later)
                OP_2 OP_PICK //X1
                OP_SUB //lamda^2 - X1 
                OP_4 OP_ROLL //X2
                OP_SUB //X3 = lamda^2 - X1 - X2
                    OP_DEPTH OP_1SUB OP_PICK OP_MOD

                OP_ROT //X1
                OP_OVER //X1, X3
                OP_SUB //X1 - X3
                OP_ROT //lamda
                OP_MUL //lamda * (X1-X3)
                OP_ROT //Y1
                OP_SUB //Y3 = lambda * (X1-X3) - Y1
                    OP_DEPTH OP_1SUB OP_PICK OP_TUCK OP_MOD OP_DUP OP_0 OP_LESSTHAN OP_IF OP_ADD OP_ELSE OP_NIP OP_ENDIF

                OP_SWAP
            OP_ENDIF
        OP_ENDIF
    OP_ENDIF
> <0x03> OP_DEFINE

OP_DEPTH OP_6 OP_EQUALVERIFY //Verify stack
OP_5 OP_PICK OP_SHA256 OP_EQUALVERIFY //Verify Table

OP_2DUP OP_0 OP_EQUAL OP_SWAP OP_0 OP_EQUAL OP_BOOLAND //k1 == 0 && k2 == 0
OP_IF
    //Return infinite point
    OP_2DROP OP_2DROP OP_2DROP
    <0>
    <0x01>
    <0x01>
OP_ELSE
    <115792089237316195423570985008687907853269984665640564039457584007908834671663> //CURVE.P
    <55594575648329892869085402983802832744385952214688224221778511981742606582254> //BETA

    OP_4 OP_ROLL OP_TOALTSTACK //k

    OP_2SWAP
    OP_2ROT
    OP_2SWAP

    OP_FROMALTSTACK OP_ROT OP_ROT //k, k2, k1
    
    //Verify GLV
    OP_2DUP //k, k2, k1, k2, k1
    OP_4 OP_ROLL //k
    OP_ROT OP_ROT //k2, k1, k, k2, k1
    OP_SWAP //k1, k2
    <115792089237316195423570985008687907852837564279074904382605163141518161494337> //n
    OP_TUCK OP_MOD OP_DUP OP_0 OP_LESSTHAN OP_IF OP_OVER OP_ADD OP_ENDIF
    OP_ROT OP_ROT
    OP_TUCK OP_MOD OP_DUP OP_0 OP_LESSTHAN OP_IF OP_OVER OP_ADD OP_ENDIF
    OP_ROT
    <37718080363155996902926221483475020450927657555482586988616620542887997980018> //λ
    OP_MUL //(k2 mod * λ)
    OP_ADD
    OP_SWAP
    OP_MOD
    OP_EQUALVERIFY

    // //Verify GLV
    // OP_2DUP //k, k2, k1, k2, k1
    // OP_4 OP_ROLL //k
    // OP_ROT OP_ROT //k2, k1, k, k2, k1
    // OP_SWAP //k1, k2
    // <37718080363155996902926221483475020450927657555482586988616620542887997980018> //λ
    // OP_MUL //(k2 * λ)
    // <115792089237316195423570985008687907852837564279074904382605163141518161494337> //n
    // OP_TUCK //k1, n, (k2 * λ), n
    // OP_MOD //(k2 * λ) mod n
    // OP_ROT //n, (k2 * λ) mod n, k1
    // OP_ADD //k1 + (k2 * λ) mod n
    // OP_SWAP //k1 + (k2 * λ) mod n, n
    // OP_MOD //(k1 + (k2 * λ) mod n) mod n
    // OP_EQUALVERIFY

    OP_OVER OP_DUP OP_0 OP_LESSTHAN OP_IF OP_NEGATE <0> OP_ELSE <1> OP_ENDIF //(k2Abs, k2SignPos)
        OP_SWAP
        OP_SIZE <8> OP_MUL //k2Abs.bitLen
        // OP_3 OP_ADD OP_2 OP_RSHIFTNUM //windowSize (bits + 3) >> 2;
        OP_3 OP_ADD OP_4 OP_DIV
        OP_ROT OP_SWAP //(k2Abs, k2Pos, k2WindowSize)
    OP_3 OP_PICK OP_DUP OP_0 OP_LESSTHAN OP_IF OP_NEGATE <0> OP_ELSE <1> OP_ENDIF //(k1Abs, k1SignPos)
        OP_SWAP
        OP_SIZE <8> OP_MUL //k1Abs.bitLen
        // OP_3 OP_ADD OP_2 OP_RSHIFTNUM //windowSize (bits + 3) >> 2;
        OP_3 OP_ADD OP_4 OP_DIV
        OP_ROT OP_SWAP //(k1Abs, k1Pos, k1WindowSize)

    OP_DUP OP_4 OP_PICK //(k1WindowSize, k2WindowSize)
    OP_MAX //maxWindowSize
    OP_1SUB //i = maxByteSize - 1
    OP_TOALTSTACK

    OP_DEPTH OP_4 OP_SUB OP_ROLL

    <0> <0>

    //(Table(P), k2, k1, k2Abs, k2Pos, k2Win, k1Abs, k1Pos, k1Win, i, Pz, Py, Px)
    OP_BEGIN
        OP_ROT <33> OP_SPLIT OP_SWAP OP_BIN2NUM OP_2SWAP
        <0x02> OP_INVOKE //double
        OP_ROT <33> OP_SPLIT OP_SWAP OP_BIN2NUM OP_2SWAP
        <0x02> OP_INVOKE //double
        OP_ROT <33> OP_SPLIT OP_SWAP OP_BIN2NUM OP_2SWAP
        <0x02> OP_INVOKE //double
        OP_ROT <33> OP_SPLIT OP_SWAP OP_BIN2NUM OP_2SWAP
        <0x02> OP_INVOKE //double

        OP_FROMALTSTACK OP_DUP //i
        OP_5 OP_PICK //k1Abs.windowSize
        OP_LESSTHAN //i < k1Abs.windowSize
        OP_IF
            OP_6 OP_PICK //k1Abs
            OP_OVER //i
            //GetWindow(k,i)
                OP_4 OP_MUL //4i
                OP_RSHIFTNUM  //k >> 4i
                OP_DUP OP_0NOTEQUAL
                OP_IF 
                    OP_SIZE <15> OP_SWAP OP_NUM2BIN //0xf (in same byte len size) 2^x - 1
                    OP_AND //(k >> 4i) & 0xf
                    OP_BIN2NUM //Window
                OP_ENDIF
            OP_DUP OP_0NOTEQUAL //window1 != 0
            OP_IF
                // GetTableEntry(window)
                    OP_1SUB <66> OP_MUL
                    OP_DEPTH OP_3 OP_SUB OP_PICK 
                    OP_SWAP OP_SPLIT OP_NIP <66> OP_SPLIT OP_DROP 
                    <33> OP_SPLIT OP_BIN2NUM OP_SWAP OP_BIN2NUM
                OP_5 OP_ROLL <33> OP_SPLIT OP_SWAP OP_BIN2NUM OP_2SWAP
                OP_8 OP_PICK //k1Pos
                OP_0 OP_EQUAL //!k1Pos
                OP_IF 
                    OP_SWAP OP_NEGATE OP_DUP OP_0 OP_EQUAL OP_NOTIF OP_DUP OP_0 OP_LESSTHAN OP_IF OP_DEPTH OP_1SUB OP_PICK OP_SWAP OP_ADD OP_ENDIF OP_ENDIF OP_SWAP //Negate Y
                OP_ENDIF
                OP_6 OP_ROLL //Py
                OP_6 OP_ROLL //Px

                <0x03> OP_INVOKE //MixedAdd(P2y, P2x, Py, Px)
            OP_ELSE
                OP_DROP
                OP_SWAP OP_2SWAP OP_ROT
            OP_ENDIF
        OP_ENDIF

        OP_3 OP_PICK //i
        OP_8 OP_PICK //k2Abs.windowSize
        OP_LESSTHAN //i < k2Abs.windowSize
        OP_IF
            OP_9 OP_PICK //k2Abs
            OP_4 OP_PICK //i
            //GetWindow(k,i)
                OP_4 OP_MUL //4i
                OP_RSHIFTNUM  //k >> 4i
                OP_DUP OP_0NOTEQUAL
                OP_IF 
                    OP_SIZE <15> OP_SWAP OP_NUM2BIN //0xf (in same byte len size) 2^x - 1
                    OP_AND //(k >> 4i) & 0xf
                    OP_BIN2NUM //Window
                OP_ENDIF
            OP_DUP OP_0NOTEQUAL //window2 != 0
            OP_IF
                // GetTableEntry(window)
                    OP_1SUB <66> OP_MUL
                    OP_DEPTH OP_3 OP_SUB OP_PICK 
                    OP_SWAP OP_SPLIT OP_NIP <66> OP_SPLIT OP_DROP 
                    <33> OP_SPLIT OP_BIN2NUM OP_SWAP OP_BIN2NUM
                // ApplyEndorphism(Y,X)
                    OP_DEPTH OP_2 OP_SUB OP_PICK
                    OP_MUL
                    OP_DEPTH OP_1SUB OP_PICK OP_MOD
                OP_4 OP_ROLL <33> OP_SPLIT OP_SWAP OP_BIN2NUM OP_2SWAP
                OP_11 OP_PICK //k2Pos
                OP_0 OP_EQUAL //!k2Pos
                OP_IF 
                    OP_SWAP OP_NEGATE OP_DUP OP_0 OP_EQUAL OP_NOTIF OP_DUP OP_0 OP_LESSTHAN OP_IF OP_DEPTH OP_1SUB OP_PICK OP_SWAP OP_ADD OP_ENDIF OP_ENDIF OP_SWAP //Negate Y
                OP_ENDIF
                OP_5 OP_ROLL //Py
                OP_5 OP_ROLL //Px

                <0x03> OP_INVOKE //MixedAdd(P2y, P2x, Py, Px)
            OP_ELSE
                OP_DROP
            OP_ENDIF
        OP_ENDIF
        
        OP_3 OP_ROLL //i
        OP_1SUB //i - 1
        OP_DUP OP_TOALTSTACK OP_0 OP_LESSTHAN
    OP_UNTIL
OP_ENDIF

OP_FROMALTSTACK OP_DROP
OP_TOALTSTACK OP_TOALTSTACK
OP_2DROP OP_2DROP OP_2DROP OP_2DROP OP_2DROP OP_2DROP
OP_FROMALTSTACK OP_FROMALTSTACK